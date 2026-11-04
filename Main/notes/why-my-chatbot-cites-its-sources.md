Most chatbots will answer anything you ask them. That's the problem.

Ask a general-purpose assistant about me and it will happily write a confident paragraph — some of it true, some of it plausible, some of it invented. For a portfolio, "plausible" is the worst possible outcome: a recruiter can't tell which sentence to trust.

So the **Ask me** chat on this site works the other way round.

## It only knows one document

My résumé is split into about twenty-five small, self-contained chunks — one fact each: a project, an internship, a set of skills, a competition result. On every question, those chunks are sent to Claude as a single *citable document*, together with a short brief:

- answer only from the document;
- if the answer isn't there, say so and point to my email;
- keep it short, and never guess numbers, dates or employers.

## Every claim comes back with a receipt

Because the résumé goes in as a citable document, the answer doesn't come back as one block of text. It comes back in pieces, and each factual piece is tied to the exact chunk that supports it. The site numbers those chunks and shows them under the reply — click one and you land on the part of the page it came from.

That changes the conversation. You don't have to trust the model; you can check it.

## Saying "I don't know" is a feature

Ask it my salary expectations or my favourite film and it will tell you it doesn't know — because the document doesn't say. That's not a failure. In a retrieval system, an honest "not in my sources" is worth more than a fluent guess, and it's the same rule I build into the assistants I make for real documents.

## The boring parts that keep it running

- A per-visitor rate limit and a daily ceiling, so a public chatbot can't run up a bill.
- The résumé sits at the front of every request and is cached, so repeat questions are cheap.
- If the AI is unavailable, the chat quietly falls back to simple scripted answers instead of breaking.

It's a small system, but it's the whole idea of grounded AI in miniature: **retrieve first, answer only from what you found, and show your work.**

Try it — the *Ask me* button is in the bottom-right corner of the [home page](/).
