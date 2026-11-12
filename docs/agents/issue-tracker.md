# Issue tracker: local markdown

Adapted from the `local` template shipped with mattpocock/skills (MIT). Issues and specs live as markdown in `.scratch/` and **are committed to git**.

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, one file per ticket
- State is a `Status:` line near the top (`ready-for-agent`, `ready-for-human`, `needs-info`, `done`)
- Conversation appends under `## Comments`

"Publish to the issue tracker" = create the file. "Fetch the ticket" = read the file the human names.
