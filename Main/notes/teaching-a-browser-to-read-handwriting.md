The handwriting reader in [the lab](/#lab) is a small neural network: 64 inputs, a hidden layer of 64, and 10 outputs — one per digit. I trained it on the classic UCI handwritten-digits set (1,797 examples, each shrunk to an 8×8 grid), and on digits it had never seen it scored **98%**.

Then I drew a 7 in the browser. It said 3. I drew a 1. It said 8.

## The model wasn't wrong — the input was

A test score only tells you how a model does on data that looks like its training data. My drawings didn't.

The training digits were scanned with a thick pen, centred, and scaled to fill most of the frame before being pooled down to 8×8. My canvas strokes were thin, often off-centre, and sat in a lot of empty space. After shrinking to 8×8, a thin 7 in the corner barely lit up a few pixels — and those few pixels genuinely did look more like a 3.

## The fix: make the browser see like the dataset

Two changes made it work:

1. **Match the preprocessing.** In the browser, the drawing is now cropped to its ink, padded, fitted into the same sub-frame the dataset uses, and pooled to 8×8 the same way — so a sketch reaches the model looking like a scan.
2. **Retrain on what the browser produces.** I re-generated training images through that exact pipeline, with brush widths and positions like real mouse and finger strokes, and retrained.

Accuracy on the held-out test set stayed at about 98%. The difference was everywhere else: every hand-drawn test digit was now read correctly.

## What I took from it

> The number on your test set is a promise about one distribution. Your users bring another.

It's the same lesson as with crop photos from a real farm or questions from a real recruiter: most of the work in applied ML is making the data your model sees in production look like the data it learned from — or teaching it the difference.

Draw something in the lab and see if you can fool it.
