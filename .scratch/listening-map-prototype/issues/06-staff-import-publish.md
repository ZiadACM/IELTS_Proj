# 06: Staff: import, list, publish

**What to build:** Staff sign in and see an item list with status. A content author imports an item file; rejected imports list validator codes. Only a content reviewer can publish.

**Blocked by:** 01 Content format version 1; 05 Accounts

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Import runs the same validation as the content validator and shows its codes on rejection
- [ ] Item list shows draft and published items to staff only
- [ ] Publish is refused for content_author and allowed for content_reviewer (D8)
- [ ] Learners, guests and admin are denied all staff endpoints; security authorization cases pass

## Comments
