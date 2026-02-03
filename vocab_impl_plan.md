# Vocabulary Study Implementation

## Goal
Create an interactive "Flashcard" style learning experience for vocabulary at `/study/vocab`.

## Features
1.  **Session Setup**: Selecting words to study (e.g., words in 'learning' or 'review' state, or 'new' words).
2.  **Flashcard UI**:
    *   **Front**: Word only.
    *   **Back**: Sentence, Translation, Reason.
    *   **Interaction**: Click to flip.
3.  **Actions**:
    *   **Know it (Right)**:
        *   If `new` -> `learning`
        *   If `learning` -> `mastered` (for MVP simplicity, or maybe `review` first?) -> Let's do `new` -> `learning`, `learning` -> `mastered` for now.
    *   **Don't know (Left)**:
        *   Stay in current status.
4.  **Result Screen**: Summary of the session.

## Components
*   `src/app/study/vocab/page.tsx`: Main controller.
*   (Inline) `Flashcard`: Component for the card.

## Logic
*   Fetch `words` from store.
*   Filter for a "Deck" (priority: new, learning).
*   Cycle through deck.
