import type { Category } from "@/types/category";

/** New categories for the 600+ tool expansion. Imported by data/categories.ts. */
export const extraCategories: Category[] = [
  {
    slug: "audio",
    title: "Audio Tools",
    shortTitle: "Audio",
    description: "Record, trim, analyse and convert audio in your browser.",
    longDescription:
      "Toolora audio tools use the Web Audio API to record, trim, fade, normalise, analyse and export sound locally on your device. Only formats the browser can genuinely encode (WAV) are offered for conversion — anything else is honestly marked Coming Soon.",
    accent: "fuchsia",
    icon: "spark",
    seoTitle: "Audio Tools — Record, Trim & Analyse Audio | Toolora",
    seoDescription:
      "Free online audio tools: recorder, trimmer, waveform viewer, volume analyser and WAV export. Private, local processing.",
    keywords: ["audio trimmer", "voice recorder", "audio waveform", "wav converter", "volume normalizer"],
    faq: [
      {
        question: "Do my recordings leave my device?",
        answer: "No. Recording and processing happen locally in your browser; nothing is uploaded to a server.",
      },
      {
        question: "Can I convert to MP3?",
        answer:
          "Browsers cannot encode MP3 without extra libraries, so conversion outputs WAV — a universal lossless format.",
      },
    ],
  },
  {
    slug: "datetime",
    title: "Date & Time Tools",
    shortTitle: "Date & Time",
    description: "Age, durations, calendars, timers and world clocks.",
    longDescription:
      "Toolora date and time tools calculate ages, durations, business days and countdowns, plus real stopwatches, timers and world clocks that run in your browser.",
    accent: "sky",
    icon: "calendar",
    seoTitle: "Date & Time Tools — Age, Duration, Timers & Clocks | Toolora",
    seoDescription:
      "Free date and time tools: age calculator, date difference, countdowns, stopwatch, pomodoro timer and world clock.",
    keywords: ["age calculator", "date difference", "countdown timer", "stopwatch", "world clock"],
    faq: [
      {
        question: "Are calculations accurate?",
        answer: "Yes — dates are computed with real calendar logic including leap years.",
      },
      {
        question: "Do timers work when the tab sleeps?",
        answer: "Timers use wall-clock time, so short backgrounding stays accurate on modern mobile browsers.",
      },
    ],
  },
  {
    slug: "finance",
    title: "Finance & Money Tools",
    shortTitle: "Finance",
    description: "Interest, loans, budgets and salary calculators.",
    longDescription:
      "Toolora finance tools are generic educational calculators for interest, loans, mortgages, budgets and salaries. They never connect to banks, never ask for credentials, and never give personalised financial advice.",
    accent: "emerald",
    icon: "bank",
    seoTitle: "Finance Calculators — Interest, Loans & Budgets | Toolora",
    seoDescription:
      "Free finance calculators: compound interest, loan EMI, mortgage, budget and salary tools. Educational only, no sign-up.",
    keywords: ["compound interest calculator", "loan emi calculator", "mortgage calculator", "budget planner"],
    faq: [
      {
        question: "Is this financial advice?",
        answer: "No. These are generic educational calculators. Talk to a qualified adviser for personal decisions.",
      },
      {
        question: "Do I enter bank details?",
        answer: "Never. Only type plain numbers like amounts, rates and years — no accounts or credentials.",
      },
    ],
  },
  {
    slug: "business",
    title: "Business & Office Tools",
    shortTitle: "Business",
    description: "Invoices, receipts, planners and cost calculators.",
    longDescription:
      "Toolora business tools generate invoices, receipts, quotes, agendas and plans as downloadable documents, and calculate costs, margins and payroll — all locally, free for freelancers and small teams.",
    accent: "slate",
    icon: "receipt",
    seoTitle: "Business Tools — Invoices, Receipts & Planners | Toolora",
    seoDescription:
      "Free business tools: invoice generator, receipt maker, meeting planner, margin and payroll calculators.",
    keywords: ["invoice generator", "receipt generator", "meeting agenda", "profit margin calculator"],
    faq: [
      {
        question: "Are generated documents mine to keep?",
        answer: "Yes — download or print them; everything is created locally in your browser.",
      },
      {
        question: "Is my business data uploaded?",
        answer: "No. All documents are generated on-device and never sent anywhere.",
      },
    ],
  },
  {
    slug: "student",
    title: "Student & Education Tools",
    shortTitle: "Student",
    description: "GPA, grades, citations, flashcards and study planners.",
    longDescription:
      "Toolora student tools help with GPA and grade math, APA/MLA/Chicago citations, flashcards, quizzes and study planning — free for learners of all ages.",
    accent: "amber",
    icon: "check",
    seoTitle: "Student Tools — GPA, Citations & Study Planners | Toolora",
    seoDescription:
      "Free student tools: GPA calculator, grade calculator, citation generator, flashcards and study planner.",
    keywords: ["gpa calculator", "grade calculator", "citation generator", "flashcards", "study planner"],
    faq: [
      {
        question: "Which GPA scale is used?",
        answer: "The standard 4.0 scale by default, with plus/minus grades supported.",
      },
      {
        question: "Are citations accurate?",
        answer: "Citations follow standard APA, MLA and Chicago patterns — always double-check against your style guide.",
      },
    ],
  },
  {
    slug: "social",
    title: "Social Media & Creator Tools",
    shortTitle: "Social",
    description: "Captions, bios, counters and image sizes for creators.",
    longDescription:
      "Toolora creator tools count characters for X, Instagram, YouTube and TikTok, resize images to platform sizes, and draft captions, bios and hashtags from your own keywords using transparent on-device rules.",
    accent: "rose",
    icon: "spark",
    seoTitle: "Social Media Tools — Captions, Bios & Image Sizes | Toolora",
    seoDescription:
      "Free creator tools: character counters, caption and bio drafters, hashtag helpers and social image resizers.",
    keywords: ["instagram caption", "hashtag generator", "character counter", "youtube thumbnail size"],
    faq: [
      {
        question: "Is an AI writing my captions?",
        answer: "No — drafts are assembled on-device from your keywords with transparent templates, honestly labelled.",
      },
      {
        question: "Are platform sizes current?",
        answer: "Sizes follow published platform guidelines and each tool page lists the exact dimensions used.",
      },
    ],
  },
  {
    slug: "seo",
    title: "SEO & Website Tools",
    shortTitle: "SEO",
    description: "Meta tags, schema, sitemaps and content analysers.",
    longDescription:
      "Toolora SEO tools generate meta tags, robots.txt, sitemaps and JSON-LD schema, and analyse headings, keywords and readability of your own text — everything runs locally.",
    accent: "cyan",
    icon: "search",
    seoTitle: "SEO Tools — Meta Tags, Schema & Analysers | Toolora",
    seoDescription:
      "Free SEO tools: meta generator, schema markup, sitemap builder, keyword density and readability checkers.",
    keywords: ["meta description generator", "schema generator", "sitemap generator", "keyword density checker"],
    faq: [
      {
        question: "Will this guarantee rankings?",
        answer: "No tool can. These helpers produce correct technical markup and honest content analysis.",
      },
      {
        question: "Is my content uploaded?",
        answer: "No — analysis happens locally in your browser.",
      },
    ],
  },
  {
    slug: "qr",
    title: "QR & Barcode Tools",
    shortTitle: "QR & Codes",
    description: "QR codes, barcodes, ISBN tools and ID generators.",
    longDescription:
      "Toolora code tools generate QR codes (URL, WiFi, vCard and more), Code39, Code128 and EAN-13 barcodes, validate ISBNs and create random IDs — all rendered locally on your device.",
    accent: "violet",
    icon: "qr",
    seoTitle: "QR & Barcode Tools — Generator & Validators | Toolora",
    seoDescription:
      "Free QR and barcode tools: QR generator, WiFi QR, Code128, EAN-13, ISBN validator and UUID tools.",
    keywords: ["qr code generator", "wifi qr", "barcode generator", "isbn validator", "uuid generator"],
    faq: [
      {
        question: "Do generated codes work offline?",
        answer: "Yes — codes are rendered locally and can be downloaded as PNG images.",
      },
      {
        question: "Can I read a QR code from a photo?",
        answer: "Camera-based QR reading needs a decoding library, so the QR reader is marked Coming Soon.",
      },
    ],
  },
  {
    slug: "data",
    title: "Data & File Tools",
    shortTitle: "Data",
    description: "CSV, JSON, XML viewers, hashes and file inspectors.",
    longDescription:
      "Toolora data tools view and clean CSV files, inspect JSON and XML, compute file hashes, analyse logs and convert filenames — locally, with validation and clear errors.",
    accent: "cyan",
    icon: "binary",
    seoTitle: "Data Tools — CSV, JSON, Hashes & File Checks | Toolora",
    seoDescription:
      "Free data tools: CSV viewer and cleaner, JSON inspector, hash generator, checksum verifier and hex viewer.",
    keywords: ["csv viewer", "json viewer", "hash generator", "sha256", "file checksum"],
    faq: [
      {
        question: "How large a file can I open?",
        answer: "Everyday file sizes work best; each tool validates size and reports clear errors for huge files.",
      },
      {
        question: "Is my data uploaded?",
        answer: "Never. Files are read with browser File APIs and stay on your device.",
      },
    ],
  },
  {
    slug: "security",
    title: "Security & Privacy Tools",
    shortTitle: "Security",
    description: "Password checks, hashes, tokens and security headers.",
    longDescription:
      "Toolora security tools are defensive and educational only: password strength checks, hash and token generation, JWT inspection and security-header builders. Nothing here attacks, scans or bypasses anything.",
    accent: "rose",
    icon: "lock",
    seoTitle: "Security Tools — Passwords, Hashes & Headers | Toolora",
    seoDescription:
      "Free defensive security tools: password checker, hash generator, token maker, JWT inspector and CSP builder.",
    keywords: ["password strength checker", "sha256 hash", "jwt decoder", "csp generator"],
    faq: [
      {
        question: "Are my passwords sent anywhere?",
        answer: "No — strength checks and generation happen locally; never type a real password you reuse elsewhere.",
      },
      {
        question: "Can these tools hack anything?",
        answer: "No. They are strictly defensive helpers — no scanning, cracking or bypassing of any kind.",
      },
    ],
  },
  {
    slug: "color",
    title: "Color & Design Tools",
    shortTitle: "Color",
    description: "Pickers, converters, contrast checks and CSS makers.",
    longDescription:
      "Toolora color tools convert between HEX, RGB, HSL, CMYK and HSV, check WCAG contrast, build palettes and gradients, and generate ready-to-paste CSS — with live previews.",
    accent: "fuchsia",
    icon: "resize",
    seoTitle: "Color Tools — Picker, Converter & Contrast | Toolora",
    seoDescription:
      "Free color tools: picker, HEX/RGB/HSL converter, contrast checker, palette and gradient generators.",
    keywords: ["color picker", "hex to rgb", "contrast checker", "gradient generator", "palette generator"],
    faq: [
      {
        question: "What contrast ratio passes WCAG?",
        answer: "4.5:1 for normal text (AA) and 3:1 for large text — the checker shows pass/fail live.",
      },
      {
        question: "Can I copy the CSS?",
        answer: "Yes — every generator produces copyable, paste-ready CSS.",
      },
    ],
  },
  {
    slug: "everyday",
    title: "Everyday Life Tools",
    shortTitle: "Everyday",
    description: "Health, cost, decision and household calculators.",
    longDescription:
      "Toolora everyday tools cover BMI, calories, sleep, fuel and electricity costs, coin flips, dice, pickers and team shufflers — small honest helpers for daily life.",
    accent: "emerald",
    icon: "dice",
    seoTitle: "Everyday Tools — Health, Cost & Decision Helpers | Toolora",
    seoDescription:
      "Free everyday tools: BMI, calorie and sleep calculators, coin flip, dice roller, pickers and team generator.",
    keywords: ["bmi calculator", "calorie calculator", "coin flip", "dice roller", "random picker"],
    faq: [
      {
        question: "Is health info medical advice?",
        answer: "No — health calculators are informational estimates, not medical advice.",
      },
      {
        question: "Are random draws fair?",
        answer: "Yes — they use the browser cryptographically secure random generator.",
      },
    ],
  },
  {
    slug: "food",
    title: "Food & Cooking Tools",
    shortTitle: "Food",
    description: "Recipe scaling, unit swaps, timers and nutrition math.",
    longDescription:
      "Toolora cooking tools scale recipes, convert cups to grams, run kitchen timers, plan coffee ratios and estimate nutrition — practical helpers for home cooks.",
    accent: "amber",
    icon: "calculator",
    seoTitle: "Cooking Tools — Recipe Scaler, Converters & Timers | Toolora",
    seoDescription:
      "Free cooking tools: recipe scaler, cups-to-grams, kitchen timer, coffee ratios and macro calculator.",
    keywords: ["recipe scaler", "cups to grams", "cooking timer", "coffee ratio", "macro calculator"],
    faq: [
      {
        question: "Are cup-to-gram conversions exact?",
        answer: "They use standard ingredient densities — great for home cooking, weigh for precision baking.",
      },
      {
        question: "Is nutrition data medical advice?",
        answer: "No — estimates for planning only, not medical or dietary advice.",
      },
    ],
  },
  {
    slug: "travel",
    title: "Travel Tools",
    shortTitle: "Travel",
    description: "Distances, budgets, packing lists and world clocks.",
    longDescription:
      "Toolora travel tools estimate distances, times, fuel and budgets, convert currency with your own rate, and build packing lists and countdowns for your next trip.",
    accent: "sky",
    icon: "link",
    seoTitle: "Travel Tools — Distance, Budget & Packing | Toolora",
    seoDescription:
      "Free travel tools: distance and fuel calculators, trip budget, packing list generator and world clock.",
    keywords: ["distance calculator", "fuel cost calculator", "trip budget", "packing list", "currency converter"],
    faq: [
      {
        question: "Are currency rates live?",
        answer: "No — you enter your own rate, so the math is transparent and offline-friendly.",
      },
      {
        question: "Are distances exact?",
        answer: "Road estimates use entered distances; great-circle math is labelled where used.",
      },
    ],
  },
  {
    slug: "writing",
    title: "Writing & Communication Tools",
    shortTitle: "Writing",
    description: "Readability, summaries, templates and message drafters.",
    longDescription:
      "Toolora writing tools check readability, build extractive summaries, format emails and letters, and draft messages from your inputs with transparent on-device templates — no fake AI anywhere.",
    accent: "violet",
    icon: "text",
    seoTitle: "Writing Tools — Readability, Summaries & Templates | Toolora",
    seoDescription:
      "Free writing tools: readability checker, summarizer, email formatter and message drafters. No fake AI.",
    keywords: ["readability checker", "text summarizer", "email formatter", "cover letter", "headline generator"],
    faq: [
      {
        question: "Is an AI writing for me?",
        answer: "No. Drafters use transparent templates filled with your words — what you see is how it works.",
      },
      {
        question: "Is my writing uploaded?",
        answer: "No — everything is processed locally in your browser.",
      },
    ],
  },
  {
    slug: "resume",
    title: "Resume & Job Tools",
    shortTitle: "Jobs",
    description: "Resume builder, cover letters and application tracker.",
    longDescription:
      "Toolora job tools build and format resumes from your details, draft cover letters, clean resume text, track applications locally and practise with interview question banks.",
    accent: "slate",
    icon: "receipt",
    seoTitle: "Resume & Job Tools — Builder & Tracker | Toolora",
    seoDescription:
      "Free job tools: resume builder, cover letter builder, application tracker and interview questions.",
    keywords: ["resume builder", "cover letter", "job tracker", "interview questions"],
    faq: [
      {
        question: "Where is my application data stored?",
        answer: "In your own browser (localStorage) — it never leaves your device.",
      },
      {
        question: "Can I download my resume?",
        answer: "Yes — as a clean printable document you can save as PDF from the print dialog.",
      },
    ],
  },
  {
    slug: "science",
    title: "Science & Engineering Tools",
    shortTitle: "Science",
    description: "Ohm's law, motion, waves and notation converters.",
    longDescription:
      "Toolora science tools solve Ohm's law, power, energy, force, pressure, density, frequency and wavelength problems, and convert engineering notation — showing the formula used every time.",
    accent: "cyan",
    icon: "code",
    seoTitle: "Science Tools — Ohm's Law, Waves & Units | Toolora",
    seoDescription:
      "Free science calculators: Ohm's law, power, force, pressure, frequency, wavelength and notation tools.",
    keywords: ["ohms law calculator", "power calculator", "frequency calculator", "wavelength calculator"],
    faq: [
      {
        question: "Which units are used?",
        answer: "SI units throughout — volts, amps, ohms, newtons, hertz — labelled on every tool.",
      },
      {
        question: "Are these for professional engineering?",
        answer: "They are educational helpers; critical work needs qualified review.",
      },
    ],
  },
  {
    slug: "network",
    title: "Web & Network Tools",
    shortTitle: "Network",
    description: "URL, IP, subnet, header and DNS formatters.",
    longDescription:
      "Toolora network tools parse URLs and IPs, calculate subnets and CIDR ranges, look up ports, MIME types and HTTP statuses, and format DNS records and security headers — reference tools that run fully offline.",
    accent: "emerald",
    icon: "link",
    seoTitle: "Network Tools — IP, Subnet, DNS & Headers | Toolora",
    seoDescription:
      "Free network tools: subnet calculator, CIDR tool, URL parser, port lookup and DNS formatter.",
    keywords: ["subnet calculator", "cidr calculator", "url parser", "port lookup", "dns records"],
    faq: [
      {
        question: "Do these tools scan networks?",
        answer: "No — they only compute and format. Nothing contacts any server.",
      },
      {
        question: "Why is live DNS lookup unavailable?",
        answer: "Browsers cannot do raw DNS queries, so lookup-style tools are honestly marked Coming Soon.",
      },
    ],
  },
  {
    slug: "svg",
    title: "SVG & Graphics Tools",
    shortTitle: "SVG",
    description: "View, format, optimise and encode SVG graphics.",
    longDescription:
      "Toolora SVG tools render previews, pretty-print and minify markup, convert to data URIs and back, recolour shapes and extract dimensions — all locally in your browser.",
    accent: "amber",
    icon: "code",
    seoTitle: "SVG Tools — Viewer, Formatter & Optimizer | Toolora",
    seoDescription:
      "Free SVG tools: viewer, formatter, minifier, data-URI converter and dimension extractor.",
    keywords: ["svg viewer", "svg minifier", "svg formatter", "svg to data uri"],
    faq: [
      {
        question: "Will minifying break my SVG?",
        answer: "The minifier only removes comments and safe whitespace — structure and shapes are preserved.",
      },
      {
        question: "Can I preview before downloading?",
        answer: "Yes — every tool renders a live preview of your SVG.",
      },
    ],
  },
  {
    slug: "archive",
    title: "Compression & Archive Tools",
    shortTitle: "Archive",
    description: "GZIP, ZIP and text compression in the browser.",
    longDescription:
      "Toolora archive tools gzip and gunzip text, create and extract ZIP files with real deflate compression, and calculate sizes and ratios — using browser compression streams, never a server.",
    accent: "slate",
    icon: "merge",
    seoTitle: "Compression Tools — GZIP, ZIP & Text | Toolora",
    seoDescription:
      "Free compression tools: GZIP compressor, ZIP creator and extractor, text compressor and ratio calculator.",
    keywords: ["gzip online", "zip creator", "zip extractor", "text compressor"],
    faq: [
      {
        question: "Are RAR and 7z supported?",
        answer: "No — proprietary formats need native code, so only ZIP and GZIP are offered.",
      },
      {
        question: "Is there a size limit?",
        answer: "Browser memory is the limit; everyday archives work fine and errors are reported clearly.",
      },
    ],
  },
  {
    slug: "random",
    title: "Random & Decision Tools",
    shortTitle: "Random",
    description: "Fair draws, pickers, shuffles and random data.",
    longDescription:
      "Toolora random tools flip coins, roll dice, pick names and teams, and generate random numbers, dates, colours and strings with the browser's cryptographically secure generator.",
    accent: "violet",
    icon: "dice",
    seoTitle: "Random Tools — Pickers, Dice & Generators | Toolora",
    seoDescription:
      "Free random tools: coin flip, dice roller, name picker, team generator and random data makers.",
    keywords: ["random picker", "coin flip", "dice roller", "team generator", "random number"],
    faq: [
      {
        question: "Is the randomness fair?",
        answer: "Yes — crypto.getRandomValues powers every draw, suitable for games and giveaways.",
      },
      {
        question: "Can I reproduce a draw?",
        answer: "No — draws are intentionally unpredictable; export or screenshot results you need to keep.",
      },
    ],
  },
];
