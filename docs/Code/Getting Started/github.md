---
title: Github
parent: Getting Started
nav_order: 5
---

# Github
As our software becomes more advanced and we have more contributors, maintaining a clean and organized GitHub repository is crucial for collaboration and code integrity. This guide outlines best practices to ensure efficient workflows and maintainable code.

More experienced software people please weigh in and make improvements to our practices.

## Getting Started
Start with this [Introduction to Git in VS Code](https://code.visualstudio.com/docs/sourcecontrol/intro-to-git)

It is recommended to learn here about the [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)

## Branches
We use branches to isolate feature developement, prevent conflicts with the main branch, and safely experiment. Branches makes a copy of the code and allows you to make changes which can be integrated later. 

Creating a new branch with command line:

```bash{% raw %}
git checkout -b mb_photonvision  # Create and switch to new branch 'mb_photonvision'
{% endraw %}```

Creating a new branch in VSCode:

1. Click the Git icon in the bottom left.
2. Create a new branch named your-initials_feature-name.

For naming conventions, use your initials followed by an underscore and the feature name (e.g., mb_photonvision).

## Committing Changes
You push changes you make to files as commits. These should have a brief but descriptive message of what you changed or accomplished. It is important that commit messages are specific so we can go back later and revert changes if need. You can commit changes in command line or the Source Control extension in your VSCode

```bash{% raw %}
git commit -m "Implement photovision tracking system"
{% endraw %}```

Commit early and often. 

You want to commit your changes to your branch at least when you are finished working on code in shop or at home so you can push your changes and access it from a different computer.

## Pull Requests

Once you have added a feature on your branch and it is simulated or tested on the robot you can submit a Pull Request on either the GitHub page or command line. The pull request will merge your changes into the main branch. 

Command Line:
```bash{% raw %}
gh pr create --title "Feature: Implement photovision tracking" --body "Adds photovision system for object detection."
{% endraw %}```

GitHub Web Interface:
1. Navigate to your branch
2. Click the Pull requests tab
3. Click "New Pull request"

### Review Process and Merge Conflicts
Experienced Code students or mentors should handle the pull requests and merge conflicts to make sure that the changes from your branch do not break other features.
Sometimes conflicts can be resolved automatically, but if something is changed on your branch and the main branch then it creates a merge conflict which needs to be resolved. 

Some tutorial on resolving merge conflicts should go here.

## Tips

Git version control can be a bit confusing so when in doubt use ask questions or use Google or an LLM. I would recommend not trying to fix problems yourself until you are more experienced as you can accidentally delete your progress.

Additional Resources:
- [GitHub Flow Guide](https://docs.github.com/en/get-started/using-github/github-flow)
- [Git Documentation](https://git-scm.com/doc)
- [VSCode Git Tutorial](https://code.visualstudio.com/docs/sourcecontrol/intro-to-git)

