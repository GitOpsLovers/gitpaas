# The naming of a branch, of a commit and of a Pull Request

| The item           | The rule                                                                                                        |
|--------------------|-----------------------------------------------------------------------------------------------------------------|
| Branch             | `<type>/<short-description>`, with `type` one of `feat`, `fix`, `chore`, `docs`.                                |
| Commit subject     | `type(scope): subject`, in [Conventional Commits](https://www.conventionalcommits.org/). 72 characters maximum. |
| Pull Request title | The same subject, 60 characters maximum, so GitHub shows it in full.                                            |

Write the subject in the imperative and in lower case, and add no final period. If the subject does not fit, shorten the words, and move the detail into the body of the commit.
