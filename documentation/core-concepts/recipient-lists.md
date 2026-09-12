---
icon: users
---

# Recipient Lists

Recipient Lists let you save a group of wallets and reuse them for future distributions.

## What a saved list contains

Each saved list has:

* A list name.
* A collection of recipient addresses.
* The recipient amounts currently associated with those entries.

## List actions

From the split flow you can:

* Save a new list.
* Load an existing list into the current split.
* Overwrite an existing list with the current recipients.
* Delete a saved list.

Saved lists are persisted through Splitty's Supabase backend, so they are separate from the temporary recipient rows in the current split.
