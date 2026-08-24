# The naming of a branch, of a commit and of a Pull Request

| The item           | The rule                                                                                                        |
|--------------------|-----------------------------------------------------------------------------------------------------------------|
| Branch             | `<type>/<short-description>`, with `type` one of `feat`, `fix`, `chore`, `docs`.                                |
| Commit subject     | `type(scope): subject`, in [Conventional Commits](https://www.conventionalcommits.org/). 60 characters maximum. |
| Pull Request title | The commit subject, copied character for character.                                                             |

Write the subject in the imperative and in lower case, and add no final period. The limit is 60 characters, so GitHub shows the title of the Pull Request in full. If the subject does not fit, shorten the words, and move the detail into the body of the commit.

**The title of the Pull Request is the subject of the commit, and never another text.** Copy the string of step 4 into step 6. Write no second wording, add no prefix, and remove no word. The Pull Request carries no body, so its title is the whole of what a reviewer reads in the list.

A phase that takes more than one commit gives the title of the Pull Request the subject of the first commit of the branch.
