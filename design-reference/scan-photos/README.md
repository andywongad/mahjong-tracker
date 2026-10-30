# Scan test set

Photos of real hands, each with a `.json` beside it naming the tiles that are
actually in the picture:

```
2026-10-29-east-win.jpg
2026-10-29-east-win.json   {"tiles": ["d1","d1","d1", ...], "flowers": ["f1"]}
```

`npm run scan:eval` runs every pair through each model and prints whole-hand
accuracy, per-tile accuracy, and what a scan costs. Use it to compare a change
to the prompt or the model against the set rather than against an impression.

The set is built from the admin page: mark a confirmed scan **In test set** at
`/admin/scan`, then **Export test set**, which gives the photos and the tiles
the player confirmed in this format.

Photos are kept out of git — they are pictures from other people's tables.
