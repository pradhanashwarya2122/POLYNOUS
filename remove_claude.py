#!/usr/bin/env python3
"""
Remove Claude Code co-author attributions from Git history.
Run this script from the root of your Git repository.
"""

import subprocess
import os
import sys
import re
import shutil
from pathlib import Path

def run_command(cmd, capture_output=True, check=True):
    """Run a shell command and return the output."""
    try:
        if capture_output:
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                check=check
            )
            return result.stdout.strip()
        else:
            subprocess.run(cmd, shell=True, check=check)
            return None
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {cmd}")
        print(f"Error: {e.stderr if hasattr(e, 'stderr') else e}")
        return None

def check_repo():
    """Verify we're in a Git repository."""
    result = run_command("git rev-parse --is-inside-work-tree")
    if result != "true":
        print("❌ Not in a Git repository. Please run this script from your repo root.")
        sys.exit(1)
    print("✅ Git repository detected.")

def check_uncommitted_changes():
    """Check if there are uncommitted changes."""
    result = run_command("git status --porcelain")
    if result:
        print("⚠️  You have uncommitted changes. Please commit or stash them first.")
        print("Current changes:")
        print(result)
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            print("❌ Aborted.")
            sys.exit(1)

def create_backup():
    """Create a backup of the repository."""
    print("\n📦 Creating backup...")
    backup_dir = f"backup_{int(datetime.now().timestamp())}"
    run_command(f"git clone --mirror . ../{backup_dir}", check=False)
    print(f"✅ Backup created at ../{backup_dir}")

def find_affected_commits():
    """Find all commits with Claude co-author attribution."""
    result = run_command('git log --grep="Co-authored-by: Claude" --format="%H %s"')
    if not result:
        print("✅ No commits with Claude co-author found!")
        return []
    
    commits = result.split('\n')
    print(f"🔍 Found {len(commits)} commits with Claude co-author:")
    for commit in commits:
        commit_hash, *message = commit.split(' ', 1)
        print(f"   - {commit_hash[:8]}: {message[0] if message else 'No message'}")
    return commits

def remove_with_filter_repo():
    """Use git-filter-repo to remove co-author lines."""
    print("\n🔄 Removing Claude co-author lines using git-filter-repo...")
    
    # Check if git-filter-repo is installed
    if not shutil.which('git-filter-repo'):
        print("📦 Installing git-filter-repo...")
        run_command("pip install git-filter-repo")
    
    # Create a Python script for the message callback
    filter_script = '''
import re
import sys

def filter_message(message):
    # Remove Co-authored-by: Claude lines
    cleaned = re.sub(r'\\nCo-authored-by: Claude [^\\n]*', '', message)
    # Also remove empty lines that might be left
    cleaned = re.sub(r'\\n\\n+', '\\n\\n', cleaned)
    return cleaned

# Read the message from stdin
message = sys.stdin.read()
sys.stdout.write(filter_message(message))
'''
    
    # Write the filter script to a temporary file
    with open('/tmp/git_filter.py', 'w') as f:
        f.write(filter_script)
    
    # Run git-filter-repo
    cmd = 'git filter-repo --force --message-callback "import sys; sys.path.insert(0, \\"/tmp\\"); import git_filter; sys.stdout.write(git_filter.filter_message(sys.stdin.read()))"'
    
    print("⏳ Rewriting history... This may take a moment.")
    result = run_command(cmd, check=False)
    
    if result is not None:
        print("✅ Successfully removed Claude co-author lines!")
        return True
    else:
        print("❌ Failed to rewrite history.")
        return False

def remove_with_interactive_rebase():
    """Use interactive rebase as an alternative method."""
    print("\n🔄 Trying interactive rebase method...")
    
    # Get the number of commits to rebase
    commits = find_affected_commits()
    if not commits:
        return True
    
    # Find the commit before the first affected commit
    oldest_hash = commits[-1].split()[0]
    cmd = f'git rev-parse {oldest_hash}~1'
    before_commit = run_command(cmd)
    if not before_commit:
        print("❌ Could not find parent commit.")
        return False
    
    print(f"📝 Starting rebase from {before_commit[:8]}...")
    print("⚠️  This will open your editor for each commit.")
    print("For each commit, you need to:")
    print("  1. Replace 'pick' with 'edit' for affected commits")
    print("  2. Save and close the editor")
    print("  3. The rebase will stop at each marked commit")
    print("  4. Run: git commit --amend --no-edit")
    print("  5. Then: git rebase --continue")
    
    response = input("Continue with interactive rebase? (y/N): ")
    if response.lower() != 'y':
        return False
    
    run_command(f'git rebase -i {before_commit}', capture_output=False)
    return True

def push_changes():
    """Push the rewritten history to GitHub."""
    print("\n📤 Pushing changes to GitHub...")
    
    # Get current branch name
    branch = run_command("git branch --show-current")
    if not branch:
        branch = "main"
    
    print(f"⚠️  You're about to force-push to branch: {branch}")
    print("This will rewrite history for all collaborators.")
    print("Make sure you've backed up your repository!")
    
    response = input("Push with --force-with-lease? (y/N): ")
    if response.lower() != 'y':
        print("❌ Push cancelled.")
        return False
    
    result = run_command(f"git push --force-with-lease origin {branch}", check=False)
    
    if result is not None:
        print("✅ Successfully pushed changes!")
        print("⏳ GitHub will update the contributor list. This may take hours to days.")
        return True
    else:
        print("❌ Failed to push changes.")
        return False

def main():
    """Main execution flow."""
    print("=" * 60)
    print("🧹 Claude Code Contributor Remover")
    print("=" * 60)
    
    # Step 1: Verify repository
    check_repo()
    
    # Step 2: Check for uncommitted changes
    check_uncommitted_changes()
    
    # Step 3: Find affected commits
    commits = find_affected_commits()
    if not commits:
        print("Nothing to do. Exiting.")
        return
    
    # Step 4: Create backup (optional)
    response = input("\nCreate backup before proceeding? (Y/n): ")
    if response.lower() != 'n':
        from datetime import datetime
        create_backup()
    
    # Step 5: Choose method
    print("\nChoose removal method:")
    print("1. git-filter-repo (recommended, fully automatic)")
    print("2. Interactive rebase (manual, more control)")
    choice = input("Enter choice (1 or 2): ")
    
    success = False
    if choice == '1':
        success = remove_with_filter_repo()
    elif choice == '2':
        success = remove_with_interactive_rebase()
    else:
        print("❌ Invalid choice.")
        sys.exit(1)
    
    if not success:
        print("\n⚠️  The rewrite failed. Restoring from backup?")
        response = input("Run git reset --hard HEAD to restore? (y/N): ")
        if response.lower() == 'y':
            run_command("git reset --hard HEAD")
            print("✅ Restored to original state.")
        sys.exit(1)
    
    # Step 6: Verify changes
    print("\n🔍 Verifying changes...")
    remaining = run_command('git log --grep="Co-authored-by: Claude" --oneline')
    if remaining:
        print(f"⚠️  Still found {len(remaining.split(chr(10)))} commits with Claude attribution:")
        print(remaining)
    else:
        print("✅ All Claude co-author lines removed!")
    
    # Step 7: Push changes
    print("\n" + "=" * 60)
    print("📤 Ready to push changes to GitHub")
    print("=" * 60)
    
    if push_changes():
        print("\n🎉 Done! Claude should disappear from contributors soon.")
        print("\nNext steps:")
        print("1. Check your repository on GitHub in a few hours")
        print("2. Verify contributors list doesn't show Claude")
        print("3. If Claude still appears, you may need to wait longer for cache to refresh")
    else:
        print("\n⚠️  Changes were not pushed. Your local history has been rewritten.")
        print("To push later, run: git push --force-with-lease origin $(git branch --show-current)")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Process interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)