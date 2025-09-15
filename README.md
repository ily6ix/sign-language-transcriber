# Sign Language Transcriber

The **Sign Language Transcriber** is an assistive technology system that converts **American Sign Language (ASL)** gestures into **text (and optionally speech)**. It aims to bridge communication between Deaf/hard-of-hearing individuals and non-signers.

---

## 📖 Overview

- **Input:** User signs in front of a camera (webcam or video file).
- **Processing:** Frames are passed through **MediaPipe** to extract hand/pose landmarks.
- **Recognition:** A trained **neural network model** interprets landmark sequences and predicts corresponding words/letters.
- **Output:** Recognized text is displayed, and optionally read aloud using text-to-speech.

This project follows a standard workflow: **Video Input → Landmark Extraction → Model Inference → Text/Speech Output**.

---

## ⚙️ Installation & Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/ily6ix/sign-language-transcriber.git
   cd sign-language-transcriber
