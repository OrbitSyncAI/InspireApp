import { APP_NAME, APP_VERSION } from './version'

export const staticPages = {
  about: {
    title: 'About Us',
    emoji: 'ℹ️',
    sections: [
      {
        heading: 'Welcome to Inspire',
        body: [
          `Welcome to ${APP_NAME} — your daily source of motivation, wisdom, and positivity.`,
          'Our mission is to bring you inspiring quotes from great thinkers, leaders, philosophers, poets, and visionaries across the world — in English, Hindi, and Urdu.',
          'Inspire was built with a simple belief: words have the power to change your mindset, and a changed mindset can change your life.',
        ],
      },
      {
        heading: 'What we offer',
        body: [
          'Hundreds of carefully curated quotes across Motivation, Success, Tech, Critical Thinking, Love, Wisdom, Life, Funny, Leadership, Education, Spirituality, Nature, Hindi, and Urdu categories.',
          'Card and list views, favorites with undo/redo, archive browser, search, daily quote, share, dark mode, and in-app update checks for every device.',
          'Works as a website, Windows/macOS/Linux desktop app, Android APK, and iOS package — one experience everywhere.',
        ],
      },
      {
        heading: 'Our vision',
        body: [
          'We believe inspiration should be free, beautiful, and available offline-first on your phone or desktop.',
          'We continuously add new quotes, improve design for large screens, and ship multi-platform releases so you can stay inspired wherever you are.',
          `Current app version: ${APP_VERSION}.`,
        ],
      },
      {
        heading: 'Creator',
        body: [
          'Created and maintained by Sohel Khan (OrbitSyncAI), based in Bathuwa Khas, Raebareli, Uttar Pradesh, India.',
          'Address: Bathuwa Khas, Raebareli, Uttar Pradesh, India - 229001.',
          'Thank you for using Inspire. If a single quote lifts your day, our mission is complete.',
        ],
      },
    ],
  },

  contact: {
    title: 'Contact Us',
    emoji: '📞',
    sections: [
      {
        heading: 'We would love to hear from you',
        body: [
          'Questions, feedback, bug reports, feature ideas, or partnership inquiries — reach out anytime. We typically respond within 24 hours on business days.',
        ],
      },
      {
        heading: 'Phone / WhatsApp',
        body: [
          'Primary support number: +91 90260 53036',
          'You can call or message on WhatsApp for the fastest response.',
        ],
        phone: '+919026053036',
        phoneDisplay: '+91 90260 53036',
      },
      {
        heading: 'Owner & Address',
        body: [
          'Owner / Developer: Sohel Khan',
          'Address: Bathuwa Khas, Raebareli, Uttar Pradesh, India - 229001.',
          'This address should be used for Windows and Android app contact/support information.',
        ],
      },
      {
        heading: 'Email & online',
        body: [
          'GitHub repository: https://github.com/OrbitSyncAI/InspireApp',
          'Releases & downloadable builds: https://github.com/OrbitSyncAI/InspireApp/releases',
          'For app update issues, open the Updates page inside the app and use “Check for Updates”, or visit the Releases page above.',
        ],
      },
      {
        heading: 'What to include in a message',
        body: [
          'Your device type (Android / iOS / Windows / macOS / Linux / Web).',
          'App version shown on the Updates page.',
          'A short description of the issue or suggestion, and screenshots if possible.',
        ],
      },
      {
        heading: 'Business hours',
        body: [
          'Support is generally available Monday–Saturday, 10:00 AM – 7:00 PM IST.',
          'Messages received outside these hours are answered on the next business day.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    emoji: '🔒',
    sections: [
      {
        heading: 'Last updated',
        body: ['July 2026'],
      },
      {
        heading: 'Overview',
        body: [
          `${APP_NAME} (“we”, “our”, or “the App”) respects your privacy. This Privacy Policy explains what information we handle and how.`,
          'We design Inspire to work primarily on your device. We do not require account creation to use core quote features.',
        ],
      },
      {
        heading: 'Information we do NOT collect',
        body: [
          'We do not sell personal data.',
          'We do not require your name, email, or phone number to browse quotes.',
          'We do not upload your favorites, theme preference, or reading position to our servers for advertising profiles.',
        ],
      },
      {
        heading: 'Information stored on your device',
        body: [
          'Favorites list, theme (light/dark), last category, quote index, font size, and similar preferences are stored locally (for example in browser localStorage or app storage).',
          'This data stays on your device unless you clear app data or browser storage.',
        ],
      },
      {
        heading: 'Update checks & network use',
        body: [
          'When you tap “Check for Updates”, the App may contact GitHub’s public Releases API for OrbitSyncAI/InspireApp to compare version numbers and show changelog / download links.',
          'That request may expose a standard network address (IP) to GitHub as with any normal website visit. We do not control GitHub’s privacy practices; see GitHub’s own policies.',
          'Optional share features may open system share sheets or use the clipboard on your device.',
        ],
      },
      {
        heading: 'Third-party services',
        body: [
          'App downloads may be hosted on GitHub Releases or similar distribution channels.',
          'If you install via a third-party store, that store’s privacy policy also applies.',
        ],
      },
      {
        heading: 'Children’s privacy',
        body: [
          'Inspire is a general motivational content app. We do not knowingly collect personal information from children under 13. If you believe such data was provided, contact us to remove it from any systems we control.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You can clear local data from your browser/app settings at any time.',
          'You can decline update checks simply by not using the Updates feature.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'We may update this Privacy Policy when features change. The “Last updated” date will reflect material revisions. Continued use after changes means you accept the updated policy.',
        ],
      },
      {
        heading: 'Contact',
        body: [
          'For privacy questions: call/WhatsApp +91 90260 53036 or open an issue on the GitHub repository.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms & Conditions',
    emoji: '📜',
    sections: [
      {
        heading: 'Last updated',
        body: ['July 2026'],
      },
      {
        heading: 'Agreement',
        body: [
          `By downloading, installing, or using ${APP_NAME}, you agree to these Terms & Conditions. If you do not agree, do not use the App.`,
        ],
      },
      {
        heading: 'License to use',
        body: [
          'We grant you a personal, non-exclusive, non-transferable, revocable license to use the App for personal, non-commercial inspiration and learning.',
          'You may not reverse engineer, resell, rebrand, or redistribute the App’s proprietary packaging as your own product without written permission.',
        ],
      },
      {
        heading: 'Content',
        body: [
          'Quotes may be attributed to historical or public figures and/or original authors including Sohel Khan. Attributions are provided in good faith.',
          'Content is for informational and motivational purposes. It is not professional advice (legal, medical, financial, or otherwise).',
          'You may share individual quotes for personal non-commercial use with attribution. Mass scraping or republishing the entire database without permission is prohibited.',
        ],
      },
      {
        heading: 'Updates & versions',
        body: [
          'We may release updates via GitHub Releases or other channels. The in-app Updates screen shows your installed version and may offer download links for newer builds.',
          'You are responsible for installing updates from trusted sources (our official GitHub releases). We are not liable for modified third-party packages.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Do not misuse the App to harass others, violate laws, or distribute malware through modified builds.',
          'Do not attempt to overload or abuse public APIs used by the App (including GitHub) beyond normal personal use.',
        ],
      },
      {
        heading: 'Intellectual property',
        body: [
          `The ${APP_NAME} name, logo, UI design, and original compilation of content are protected by applicable intellectual property laws.`,
          'Third-party trademarks (authors, platforms) remain the property of their respective owners.',
        ],
      },
      {
        heading: 'Disclaimer of warranties',
        body: [
          'The App is provided “AS IS” and “AS AVAILABLE” without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.',
          'We do not guarantee uninterrupted or error-free operation on every device.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the maximum extent permitted by law, OrbitSyncAI / Sohel Khan shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, arising from your use of the App.',
        ],
      },
      {
        heading: 'Termination',
        body: [
          'Your rights under these Terms end if you stop using the App or if we discontinue distribution. Sections that by nature should survive (IP, liability limits) will survive termination.',
        ],
      },
      {
        heading: 'Governing law',
        body: [
          'These Terms are governed by the laws of India, without regard to conflict-of-law principles, unless mandatory local consumer law requires otherwise.',
        ],
      },
      {
        heading: 'Contact',
        body: [
          'Questions about these Terms: +91 90260 53036 or the GitHub repository for OrbitSyncAI/InspireApp.',
        ],
      },
    ],
  },

  disclaimer: {
    title: 'Disclaimer',
    emoji: '⚠️',
    sections: [
      {
        heading: 'Last updated',
        body: ['July 2026'],
      },
      {
        heading: 'General information only',
        body: [
          `The information provided by ${APP_NAME} is for general informational and motivational purposes only.`,
          'Nothing in the App constitutes professional advice of any kind — including medical, mental health, legal, financial, career, or religious advice.',
        ],
      },
      {
        heading: 'No guarantee of outcomes',
        body: [
          'Motivational quotes and ideas may inspire reflection, but results in your personal or professional life depend on many factors outside our control.',
          'We make no promises that any quote, feature, or update will produce specific results.',
        ],
      },
      {
        heading: 'External links & downloads',
        body: [
          'Update downloads and release notes may be hosted on GitHub or other external services. We are not responsible for downtime, policy changes, or content on third-party sites.',
          'Always download installers only from official OrbitSyncAI/InspireApp release pages to reduce security risk.',
        ],
      },
      {
        heading: 'Accuracy of attributions',
        body: [
          'We strive for accurate attribution of quotes. Historical attributions can be disputed in literature. If you find an error, please contact us so we can correct it in a future update.',
        ],
      },
      {
        heading: 'Platform differences',
        body: [
          'Features may vary slightly between Web, Windows, macOS, Linux, Android, and iOS due to OS capabilities (for example, install/update flows and code signing).',
          'Unsigned iOS builds may require special device settings and are provided for development/testing when Apple signing certificates are not available.',
        ],
      },
      {
        heading: 'User responsibility',
        body: [
          'You are solely responsible for how you interpret and apply content from the App.',
          'If you are experiencing a mental health crisis or medical emergency, contact local emergency services or a qualified professional immediately — do not rely on this App.',
        ],
      },
      {
        heading: 'Limitation',
        body: [
          'By using the App you acknowledge this Disclaimer and agree that use is at your own risk, to the fullest extent permitted by law.',
        ],
      },
      {
        heading: 'Contact',
        body: [
          'Disclaimer questions: +91 90260 53036.',
        ],
      },
    ],
  },
}
