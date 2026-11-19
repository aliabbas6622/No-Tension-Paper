import {
  ExamPaper,
  PastPaperRecord,
  PastPaperSectionPattern,
  PastPaperSubsectionPattern,
} from '../types/exam';

export const CUSTOM_PAST_PAPERS_STORAGE_KEY = 'exam_maker_custom_past_papers_v1';

const CS_2025_SECTION_PATTERNS: PastPaperSectionPattern[] = [
  {
    name: 'SECTION "A"',
    subtitle: '(MULTIPLE CHOICE QUESTIONS)',
    kind: 'mcq',
    questionCount: 15,
    attemptCount: 15,
    marksPerQuestion: 1,
    totalSectionMarks: 15,
    marksBadge: '15 Marks',
    instruction:
      'NOTE: i) This section consists of 15 part questions and all are to be answered. Each part question carries 1 mark. ii) Do not copy the part questions in your answerbook. Write only the answer in full against the proper number of the question and its part.\n1. Choose the correct answer for each from the given options:',
    numberingStyle: 'roman',
  },
  {
    name: 'SECTION "B"',
    subtitle: '(SHORT ANSWER QUESTIONS)',
    kind: 'short',
    questionCount: 15,
    attemptCount: 10,
    marksPerQuestion: 3,
    totalSectionMarks: 30,
    marksBadge: '30 Marks',
    instruction:
      'NOTE: Attempt any TEN part questions in all. All part questions carry equal marks (3 marks each). Answer should not exceed 6 to 7 lines.\n2. Answer any TEN of the following part questions:',
    numberingStyle: 'roman',
  },
  {
    name: 'SECTION "C"',
    subtitle: '(DETAILED ANSWER QUESTIONS)',
    kind: 'detailed',
    questionCount: 5,
    attemptCount: 3,
    marksPerQuestion: 10,
    totalSectionMarks: 30,
    marksBadge: '30 Marks',
    instruction:
      'NOTE: Attempt any THREE questions from this section. All questions carry equal marks (10 marks each).',
    numberingStyle: 'section-c-from-3',
  },
];

const CS_2025_EXAM_PAPER: ExamPaper = {
  id: 'past-paper-cs-2025-science-general',
  title: 'Computer Science 2025 (Science General Group)',
  classGrade: 'Class 11',
  subjectCategory: 'Computer Science',
  header: {
    examinationTitle: 'COMPUTER SCIENCE 2025',
    examinationMonth: 'ANNUAL EXAMINATION 2025',
    groupName: '(SCIENCE GENERAL GROUP)',
    subjectTitle: 'SUBJECT: COMPUTER SCIENCE',
    institutionName: '',
    date: '2025',
    duration: '3 Hours',
    maxMarks: '75',
    showDividerLine: true,
    paperCode: 'CS-2025',
    generalInstructions: [
      'Section A (15 Marks): Attempt all 15 MCQs (1 mark each).',
      'Section B (30 Marks): Attempt any TEN short part questions (3 marks each).',
      'Section C (30 Marks): Attempt any THREE detailed questions (10 marks each).',
    ],
  },
  settings: {
    paperSize: 'a4',
    fontFamily: 'times',
    fontSize: 'base',
    showMarksBadges: true,
    mcqColumns: 2,
    showGeneralInstructions: true,
    showSectionInstructions: true,
    showEndOfPaper: true,
    showQuestionMarks: true,
    showDividerMarker: true,
  },
  sections: [
    {
      id: 'pp-cs2025-sec-a',
      name: 'SECTION "A"',
      subtitle: '(MULTIPLE CHOICE QUESTIONS)',
      marksBadge: '15 Marks',
      instruction: CS_2025_SECTION_PATTERNS[0].instruction,
      questions: [
        {
          id: 'pp-cs25-mcq-1',
          number: 'i.',
          type: 'mcq',
          text: 'The primary function of CPU in computer is:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(c) To process data',
          options: [
            { id: 'pp-cs25-m1a', label: '(a)', text: 'To input data' },
            { id: 'pp-cs25-m1b', label: '(b)', text: 'To store data' },
            { id: 'pp-cs25-m1c', label: '(c)', text: 'To process data' },
            { id: 'pp-cs25-m1d', label: '(d)', text: 'To output data' },
          ],
        },
        {
          id: 'pp-cs25-mcq-2',
          number: 'ii.',
          type: 'mcq',
          text: "This is considered the 'brain' of the computer:",
          marks: 1,
          optionColumns: 4,
          answerKey: '(c) CPU',
          options: [
            { id: 'pp-cs25-m2a', label: '(a)', text: 'RAM' },
            { id: 'pp-cs25-m2b', label: '(b)', text: 'Hard disk drive' },
            { id: 'pp-cs25-m2c', label: '(c)', text: 'CPU' },
            { id: 'pp-cs25-m2d', label: '(d)', text: 'Keyboard' },
          ],
        },
        {
          id: 'pp-cs25-mcq-3',
          number: 'iii.',
          type: 'mcq',
          text: 'Smallest unit of the data in computer is:',
          marks: 1,
          optionColumns: 4,
          answerKey: '(a) Bit',
          options: [
            { id: 'pp-cs25-m3a', label: '(a)', text: 'Bit' },
            { id: 'pp-cs25-m3b', label: '(b)', text: 'Byte' },
            { id: 'pp-cs25-m3c', label: '(c)', text: 'Megabyte' },
            { id: 'pp-cs25-m3d', label: '(d)', text: 'Gigabyte' },
          ],
        },
        {
          id: 'pp-cs25-mcq-4',
          number: 'iv.',
          type: 'mcq',
          text: 'This programming language is commonly used for web development:',
          marks: 1,
          optionColumns: 4,
          answerKey: '(d) HTML',
          options: [
            { id: 'pp-cs25-m4a', label: '(a)', text: 'Turbo C' },
            { id: 'pp-cs25-m4b', label: '(b)', text: 'C++' },
            { id: 'pp-cs25-m4c', label: '(c)', text: 'Python' },
            { id: 'pp-cs25-m4d', label: '(d)', text: 'HTML' },
          ],
        },
        {
          id: 'pp-cs25-mcq-5',
          number: 'v.',
          type: 'mcq',
          text: "In internet 'URL' stands for:",
          marks: 1,
          optionColumns: 2,
          answerKey: '(a) Universal Resource Locator',
          options: [
            { id: 'pp-cs25-m5a', label: '(a)', text: 'Universal Resource Locator' },
            { id: 'pp-cs25-m5b', label: '(b)', text: 'Unique Resource Locator' },
            { id: 'pp-cs25-m5c', label: '(c)', text: 'Uniform Resource Locator' },
            { id: 'pp-cs25-m5d', label: '(d)', text: 'Ultimate Resource Locator' },
          ],
        },
        {
          id: 'pp-cs25-mcq-6',
          number: 'vi.',
          type: 'mcq',
          text: 'This is not a type of computer network:',
          marks: 1,
          optionColumns: 4,
          answerKey: '(d) CPU',
          options: [
            { id: 'pp-cs25-m6a', label: '(a)', text: 'LAN' },
            { id: 'pp-cs25-m6b', label: '(b)', text: 'WAN' },
            { id: 'pp-cs25-m6c', label: '(c)', text: 'MAN' },
            { id: 'pp-cs25-m6d', label: '(d)', text: 'CPU' },
          ],
        },
        {
          id: 'pp-cs25-mcq-7',
          number: 'vii.',
          type: 'mcq',
          text: 'The purpose of a compiler in programming language is:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(a) convert high-level language into machine code',
          options: [
            { id: 'pp-cs25-m7a', label: '(a)', text: 'convert high-level language into machine code' },
            { id: 'pp-cs25-m7b', label: '(b)', text: 'execute the program' },
            { id: 'pp-cs25-m7c', label: '(c)', text: 'translate source code into assembly language' },
            { id: 'pp-cs25-m7d', label: '(d)', text: 'debug errors in the code' },
          ],
        },
        {
          id: 'pp-cs25-mcq-8',
          number: 'viii.',
          type: 'mcq',
          text: 'SNA stands for:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(a) System Network Architecture',
          options: [
            { id: 'pp-cs25-m8a', label: '(a)', text: 'System Network Architecture' },
            { id: 'pp-cs25-m8b', label: '(b)', text: 'Small Network Area' },
            { id: 'pp-cs25-m8c', label: '(c)', text: 'Small Network Access' },
            { id: 'pp-cs25-m8d', label: '(d)', text: 'Serial Network Adaptor' },
          ],
        },
        {
          id: 'pp-cs25-mcq-9',
          number: 'ix.',
          type: 'mcq',
          text: 'The third generation of computer used:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(c) Integrated circuits',
          options: [
            { id: 'pp-cs25-m9a', label: '(a)', text: 'Vacuum tubes' },
            { id: 'pp-cs25-m9b', label: '(b)', text: 'Transistors' },
            { id: 'pp-cs25-m9c', label: '(c)', text: 'Integrated circuits' },
            { id: 'pp-cs25-m9d', label: '(d)', text: 'Micro processors' },
          ],
        },
        {
          id: 'pp-cs25-mcq-10',
          number: 'x.',
          type: 'mcq',
          text: 'Data transmission in which data flows in both directions at the same time is called:',
          marks: 1,
          optionColumns: 4,
          answerKey: '(c) Full Duplex',
          options: [
            { id: 'pp-cs25-m10a', label: '(a)', text: 'Simplex' },
            { id: 'pp-cs25-m10b', label: '(b)', text: 'Half Duplex' },
            { id: 'pp-cs25-m10c', label: '(c)', text: 'Full Duplex' },
            { id: 'pp-cs25-m10d', label: '(d)', text: 'Multiplex' },
          ],
        },
        {
          id: 'pp-cs25-mcq-11',
          number: 'xi.',
          type: 'mcq',
          text: 'This is not a type of operating system:',
          marks: 1,
          optionColumns: 4,
          answerKey: '(d) Oracle',
          options: [
            { id: 'pp-cs25-m11a', label: '(a)', text: 'Windows' },
            { id: 'pp-cs25-m11b', label: '(b)', text: 'Linux' },
            { id: 'pp-cs25-m11c', label: '(c)', text: 'Mac OS' },
            { id: 'pp-cs25-m11d', label: '(d)', text: 'Oracle' },
          ],
        },
        {
          id: 'pp-cs25-mcq-12',
          number: 'xii.',
          type: 'mcq',
          text: 'This is an example of system software:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(c) Windows',
          options: [
            { id: 'pp-cs25-m12a', label: '(a)', text: 'MS Word' },
            { id: 'pp-cs25-m12b', label: '(b)', text: 'Adobe Photoshop' },
            { id: 'pp-cs25-m12c', label: '(c)', text: 'Windows' },
            { id: 'pp-cs25-m12d', label: '(d)', text: 'Chrome Browser' },
          ],
        },
        {
          id: 'pp-cs25-mcq-13',
          number: 'xiii.',
          type: 'mcq',
          text: 'Main purpose of data communication is:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(c) To transfer data between devices',
          options: [
            { id: 'pp-cs25-m13a', label: '(a)', text: 'To store large amounts of data' },
            { id: 'pp-cs25-m13b', label: '(b)', text: 'To display images' },
            { id: 'pp-cs25-m13c', label: '(c)', text: 'To transfer data between devices' },
            { id: 'pp-cs25-m13d', label: '(d)', text: 'To protect against viruses' },
          ],
        },
        {
          id: 'pp-cs25-mcq-14',
          number: 'xiv.',
          type: 'mcq',
          text: 'Logic gate produces 1 output when all of its inputs are set to 1, otherwise 0:',
          marks: 1,
          optionColumns: 4,
          answerKey: '(a) AND',
          options: [
            { id: 'pp-cs25-m14a', label: '(a)', text: 'AND' },
            { id: 'pp-cs25-m14b', label: '(b)', text: 'NOT' },
            { id: 'pp-cs25-m14c', label: '(c)', text: 'OR' },
            { id: 'pp-cs25-m14d', label: '(d)', text: 'NOR' },
          ],
        },
        {
          id: 'pp-cs25-mcq-15',
          number: 'xv.',
          type: 'mcq',
          text: "Computer can't boot if it does not have:",
          marks: 1,
          optionColumns: 4,
          answerKey: '(c) Operating System',
          options: [
            { id: 'pp-cs25-m15a', label: '(a)', text: 'Compiler' },
            { id: 'pp-cs25-m15b', label: '(b)', text: 'Browser' },
            { id: 'pp-cs25-m15c', label: '(c)', text: 'Operating System' },
            { id: 'pp-cs25-m15d', label: '(d)', text: 'Loader' },
          ],
        },
      ],
    },
    {
      id: 'pp-cs2025-sec-b',
      name: 'SECTION "B"',
      subtitle: '(SHORT ANSWER QUESTIONS)',
      marksBadge: '30 Marks',
      instruction: CS_2025_SECTION_PATTERNS[1].instruction,
      questions: [
        {
          id: 'pp-cs25-s1',
          number: 'i.',
          type: 'short',
          text: 'What are the main devices of IoT?',
          marks: 3,
          answerKey: 'Main IoT devices include smart sensors, actuators, microcontrollers (Arduino/Raspberry Pi), smart wearables, smart home appliances, and connected industrial gateways.',
        },
        {
          id: 'pp-cs25-s2',
          number: 'ii.',
          type: 'short',
          text: 'Differentiate between Synchronous and Asynchronous.',
          marks: 3,
          answerKey: 'Synchronous transmission sends continuous blocks of data synchronized by a shared clock signal. Asynchronous transmission sends one byte/character at a time framed by start and stop bits without a shared clock.',
        },
        {
          id: 'pp-cs25-s3',
          number: 'iii.',
          type: 'short',
          text: 'What do you mean by primary and secondary storage?',
          marks: 3,
          answerKey: 'Primary storage (RAM, ROM, Cache) is fast, directly accessible by the CPU, and mostly volatile. Secondary storage (HDD, SSD, Optical drives) provides large, non-volatile long-term data retention.',
        },
        {
          id: 'pp-cs25-s4',
          number: 'iv.',
          type: 'short',
          text: 'Define the role of application software in computer field.',
          marks: 3,
          answerKey: 'Application software performs specific end-user tasks such as word processing, spreadsheets, graphic design, database management, and web browsing on top of system software.',
        },
        {
          id: 'pp-cs25-s5',
          number: 'v.',
          type: 'short',
          text: 'Define the concept of binary digits (bit, bytes and Nibble) in computing.',
          marks: 3,
          answerKey: 'A bit is a single binary digit (0 or 1), the smallest unit of data. A nibble is a group of 4 bits. A byte consists of 8 bits and typically represents a single character.',
        },
        {
          id: 'pp-cs25-s6',
          number: 'vi.',
          type: 'short',
          text: 'What is the difference between compiler and interpreter?',
          marks: 3,
          answerKey: 'A compiler translates the entire high-level program into machine code at once before execution (faster runtime). An interpreter translates and executes code line by line (easier debugging, slower runtime).',
        },
        {
          id: 'pp-cs25-s7',
          number: 'vii.',
          type: 'short',
          text: 'What are main difference between Impact and Non-Impact Printer?',
          marks: 3,
          answerKey: 'Impact printers (e.g., Dot Matrix) strike an inked ribbon against paper, making them noisy and slower. Non-impact printers (e.g., Laser, Inkjet) form images using heat, laser, or ink spray, offering quiet and high-quality output.',
        },
        {
          id: 'pp-cs25-s8',
          number: 'viii.',
          type: 'short',
          text: 'What is Metropolitan Area Network?',
          marks: 3,
          answerKey: 'A Metropolitan Area Network (MAN) spans a city or large metropolitan region (typically 5–50 km), interconnecting multiple LANs using high-speed fiber optic links such as cable TV or municipal broadband networks.',
        },
        {
          id: 'pp-cs25-s9',
          number: 'ix.',
          type: 'short',
          text: 'Define any three input and output devices.',
          marks: 3,
          answerKey: 'Input devices: Keyboard, Mouse, Scanner. Output devices: Monitor (LCD/LED), Printer, Speaker.',
        },
        {
          id: 'pp-cs25-s10',
          number: 'x.',
          type: 'short',
          text: 'Draw any one diagram of the following equation using logical gates: (A · B) + (A · B) = C   |   X + (Y · Z) = W',
          marks: 3,
          answerKey: 'For X + (Y · Z) = W: pass Y and Z into a 2-input AND gate, then feed its output together with X into a 2-input OR gate to obtain W.',
        },
        {
          id: 'pp-cs25-s11',
          number: 'xi.',
          type: 'short',
          text: 'What is the main purpose of ALU?',
          marks: 3,
          answerKey: 'The Arithmetic Logic Unit (ALU) inside the CPU performs all arithmetic operations (addition, subtraction, multiplication, division) and logical comparisons (AND, OR, NOT, <, >, =).',
        },
        {
          id: 'pp-cs25-s12',
          number: 'xii.',
          type: 'short',
          text: 'Define different types of ROM.',
          marks: 3,
          answerKey: 'Types of ROM include: MROM (Masked ROM, factory-programmed), PROM (Programmable ROM, written once), EPROM (Erasable PROM, erased via UV light), and EEPROM (Electrically Erasable PROM, erased electrically).',
        },
        {
          id: 'pp-cs25-s13',
          number: 'xiii.',
          type: 'short',
          text: 'Convert any three of the following number system: (0111)₂ = (?)₁₀  |  (243)₈ = (?)₁₀  |  (188)₁₀ = (?)₂  |  (659)₁₀ = (?)₈  |  (ABC)₁₆ = (?)₁₀  |  (785)₁₀ = (?)₁₆',
          marks: 3,
          answerKey: '(0111)₂ = (7)₁₀; (243)₈ = (163)₁₀; (188)₁₀ = (10111100)₂; (659)₁₀ = (1223)₈; (ABC)₁₆ = (2748)₁₀; (785)₁₀ = (311)₁₆.',
        },
        {
          id: 'pp-cs25-s14',
          number: 'xiv.',
          type: 'short',
          text: 'Draw block diagram of a computer system.',
          marks: 3,
          answerKey: 'Block diagram includes Input Unit -> CPU (Control Unit, ALU, Registers) <-> Primary & Secondary Memory -> Output Unit.',
        },
        {
          id: 'pp-cs25-s15',
          number: 'xv.',
          type: 'short',
          text: 'Define advancement in computer generation and highlight the key features of fourth generation.',
          marks: 3,
          answerKey: 'Fourth-generation computers (1971–present) use VLSI/microprocessors, leading to compact personal computers, high processing speed, semiconductor memory, GUI operating systems, and computer networking.',
        },
      ],
    },
    {
      id: 'pp-cs2025-sec-c',
      name: 'SECTION "C"',
      subtitle: '(DETAILED ANSWER QUESTIONS)',
      marksBadge: '30 Marks',
      instruction: CS_2025_SECTION_PATTERNS[2].instruction,
      questions: [
        {
          id: 'pp-cs25-d3',
          number: '3.',
          type: 'detailed',
          text: 'Define Computer Network. Describe LAN and WAN with the diagram.',
          marks: 10,
          answerKey: 'A computer network connects two or more devices to share resources and data. LAN covers a localized area (room/building) with high speed and private ownership; WAN spans cities/countries via public telecom/fiber links connecting multiple LANs.',
        },
        {
          id: 'pp-cs25-d4',
          number: '4.',
          type: 'detailed',
          text: 'Define data communication. Also describe its main components.',
          marks: 10,
          answerKey: 'Data communication is the exchange of digital data between two devices via a transmission medium. Its 5 main components are: Message, Sender, Receiver, Transmission Medium, and Protocol.',
        },
        {
          id: 'pp-cs25-d5',
          number: '5.',
          type: 'detailed',
          text: 'Describe different modes of data communication with examples.',
          marks: 10,
          answerKey: 'Three modes: (1) Simplex — unidirectional flow (e.g., radio/TV broadcast, keyboard to CPU); (2) Half-Duplex — bidirectional, one at a time (e.g., walkie-talkie); (3) Full-Duplex — simultaneous bidirectional flow (e.g., telephone call, modern Ethernet).',
        },
        {
          id: 'pp-cs25-d6',
          number: '6.',
          type: 'detailed',
          text: 'What is the purpose of an Operating System in a computer? Describe its features.',
          marks: 10,
          answerKey: 'An OS acts as an intermediary between computer hardware and users. Key features include Process Management, Memory Management, File System Management, Device/I/O Management, Security & Protection, and User Interface (CLI/GUI).',
        },
        {
          id: 'pp-cs25-d7',
          number: '7.',
          type: 'detailed',
          text: 'What is Boolean Algebra? Also write its rules and construct a truth table for two inputs to perform AND & OR logical operations.',
          marks: 10,
          answerKey: 'Boolean Algebra is the mathematical system dealing with binary truth values (0 and 1) and logical operations (AND, OR, NOT). Covers Identity, Null, Idempotent, Inverse, Commutative, Associative, Distributive, and De Morgan laws, plus 4-row truth tables for A·B and A+B.',
        },
      ],
    },
  ],
  createdAt: '2025-05-01T00:00:00.000Z',
  updatedAt: '2025-05-01T00:00:00.000Z',
};

const ENG_CLASS11_SECTION_PATTERNS: PastPaperSectionPattern[] = [
  {
    name: 'SECTION "A"',
    subtitle: '(MULTIPLE CHOICE QUESTIONS)',
    kind: 'mcq',
    questionCount: 20,
    attemptCount: 20,
    marksPerQuestion: 1,
    totalSectionMarks: 20,
    marksBadge: '20 Marks',
    instruction:
      'NOTE: i) This section consists of 20 part questions and all are to be answered. Each part question carries 1 mark. ii) Write only the correct option in full against the proper question number.\n1. Choose the correct answer for each from the given options:',
    numberingStyle: 'roman',
  },
  {
    name: 'SECTION "B"',
    subtitle: '(SHORT ANSWER QUESTIONS)',
    kind: 'short',
    questionCount: 13,
    attemptCount: 10,
    marksPerQuestion: 4,
    totalSectionMarks: 40,
    marksBadge: '40 Marks',
    instruction:
      'NOTE: Attempt any TEN part-questions in all, selecting at least THREE from Prose, THREE from Poem, and THREE from Grammar. All part-questions carry equal marks (4 marks each).\n2. Answer the following part questions:',
    numberingStyle: 'roman',
    subsectionPatterns: [
      {
        title: 'Sub-Section I (Prose)',
        questionCount: 4,
        marksPerQuestion: 4,
        matchHints: ['prose'],
      },
      {
        title: 'Sub-Section II (Poem)',
        questionCount: 4,
        marksPerQuestion: 4,
        matchHints: ['poem', 'poetry', 'play'],
      },
      {
        title: 'Sub-Section III (Grammar)',
        questionCount: 5,
        marksPerQuestion: 4,
        matchHints: ['grammar'],
      },
    ],
  },
  {
    name: 'SECTION "C"',
    subtitle: '(DETAILED ANSWER QUESTIONS)',
    kind: 'detailed',
    questionCount: 3,
    attemptCount: 3,
    marksPerQuestion: 15,
    marksPerQuestionList: [15, 10, 15],
    totalSectionMarks: 40,
    marksBadge: '40 Marks',
    instruction: 'NOTE: Attempt all THREE questions from this section as per marks shown against each.',
    numberingStyle: 'section-c-from-3',
  },
];

const ENG_CLASS11_EXAM_PAPER: ExamPaper = {
  id: 'past-paper-eng-biek-class11',
  title: 'English (Compulsory) Class 11 (BIEK Pattern)',
  classGrade: 'Class 11',
  subjectCategory: 'English',
  header: {
    examinationTitle: 'INTERMEDIATE EXAMINATION (CLASS XI)',
    examinationMonth: 'ANNUAL BOARD PATTERN PAPER',
    groupName: '(COMPULSORY — ALL GROUPS)',
    subjectTitle: 'SUBJECT: ENGLISH (NORMAL PAPER-I)',
    institutionName: '',
    date: '2025',
    duration: '3 Hours',
    maxMarks: '100',
    showDividerLine: true,
    paperCode: 'ENG-XI-BIEK',
    generalInstructions: [
      'Section A (20 Marks): Attempt all 20 Multiple Choice Questions (1 mark each).',
      'Section B (40 Marks): Attempt any TEN short part-questions across Prose, Poem, and Grammar (4 marks each).',
      'Section C (40 Marks): Attempt all THREE detailed composition and reading tasks.',
    ],
  },
  settings: {
    paperSize: 'a4',
    fontFamily: 'times',
    fontSize: 'base',
    showMarksBadges: true,
    mcqColumns: 2,
    showGeneralInstructions: true,
    showSectionInstructions: true,
    showEndOfPaper: true,
    showQuestionMarks: true,
    showDividerMarker: true,
  },
  sections: [
    {
      id: 'pp-eng11-sec-a',
      name: 'SECTION "A"',
      subtitle: '(MULTIPLE CHOICE QUESTIONS)',
      marksBadge: '20 Marks',
      instruction: ENG_CLASS11_SECTION_PATTERNS[0].instruction,
      questions: [
        {
          id: 'pp-eng11-mcq-1',
          number: 'i.',
          type: 'mcq',
          text: 'Quaid-e-Azam emphasized that religion in Pakistan is a personal matter and has nothing to do with:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(c) The business of the State',
          options: [
            { id: 'pp-e11-m1a', label: '(a)', text: 'Private conscience' },
            { id: 'pp-e11-m1b', label: '(b)', text: 'Places of worship' },
            { id: 'pp-e11-m1c', label: '(c)', text: 'The business of the State' },
            { id: 'pp-e11-m1d', label: '(d)', text: 'Moral values' },
          ],
        },
        {
          id: 'pp-eng11-mcq-2',
          number: 'ii.',
          type: 'mcq',
          text: 'The destruction of natural habitats primarily endangers global:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(b) Biodiversity',
          options: [
            { id: 'pp-e11-m2a', label: '(a)', text: 'Urban concrete' },
            { id: 'pp-e11-m2b', label: '(b)', text: 'Biodiversity' },
            { id: 'pp-e11-m2c', label: '(c)', text: 'Plastic trade' },
            { id: 'pp-e11-m2d', label: '(d)', text: 'Mineral mining' },
          ],
        },
        {
          id: 'pp-eng11-mcq-3',
          number: 'iii.',
          type: 'mcq',
          text: 'In "Managing Change", clinging fearfully to outdated customs leaves a person:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(a) Unprepared for future challenges',
          options: [
            { id: 'pp-e11-m3a', label: '(a)', text: 'Unprepared for future challenges' },
            { id: 'pp-e11-m3b', label: '(b)', text: 'Guaranteed early promotion' },
            { id: 'pp-e11-m3c', label: '(c)', text: 'Immune to economic shifts' },
            { id: 'pp-e11-m3d', label: '(d)', text: 'Free from responsibility' },
          ],
        },
        {
          id: 'pp-eng11-mcq-4',
          number: 'iv.',
          type: 'mcq',
          text: 'Strong passwords and cautious link-checking protect digital users from:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(d) Cyber fraud and data theft',
          options: [
            { id: 'pp-e11-m4a', label: '(a)', text: 'Hardware overheating' },
            { id: 'pp-e11-m4b', label: '(b)', text: 'Battery aging' },
            { id: 'pp-e11-m4c', label: '(c)', text: 'Keyboard wear' },
            { id: 'pp-e11-m4d', label: '(d)', text: 'Cyber fraud and data theft' },
          ],
        },
        {
          id: 'pp-eng11-mcq-5',
          number: 'v.',
          type: 'mcq',
          text: 'Defacing public walls or wasting clean water in shared spaces shows a lack of:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(b) Civic responsibility',
          options: [
            { id: 'pp-e11-m5a', label: '(a)', text: 'Artistic flair' },
            { id: 'pp-e11-m5b', label: '(b)', text: 'Civic responsibility' },
            { id: 'pp-e11-m5c', label: '(c)', text: 'Commercial skill' },
            { id: 'pp-e11-m5d', label: '(d)', text: 'Academic degrees' },
          ],
        },
        {
          id: 'pp-eng11-mcq-6',
          number: 'vi.',
          type: 'mcq',
          text: 'According to "Choosing Career", consulting parents, teachers, and career counselors helps avoid:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(c) Hasty and mismatched decisions',
          options: [
            { id: 'pp-e11-m6a', label: '(a)', text: 'University scholarships' },
            { id: 'pp-e11-m6b', label: '(b)', text: 'Skill development' },
            { id: 'pp-e11-m6c', label: '(c)', text: 'Hasty and mismatched decisions' },
            { id: 'pp-e11-m6d', label: '(d)', text: 'Hard work' },
          ],
        },
        {
          id: 'pp-eng11-mcq-7',
          number: 'vii.',
          type: 'mcq',
          text: 'Ranikot Fort in Sindh is widely celebrated as the world’s largest:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(b) Historical fort wall complex',
          options: [
            { id: 'pp-e11-m7a', label: '(a)', text: 'Underground subway' },
            { id: 'pp-e11-m7b', label: '(b)', text: 'Historical fort wall complex' },
            { id: 'pp-e11-m7c', label: '(c)', text: 'Modern seaport' },
            { id: 'pp-e11-m7d', label: '(d)', text: 'Observatory tower' },
          ],
        },
        {
          id: 'pp-eng11-mcq-8',
          number: 'viii.',
          type: 'mcq',
          text: 'In "The Character of a Happy Life", whom does the happy man refuse to envy?',
          marks: 1,
          optionColumns: 2,
          answerKey: '(a) Those raised by chance or wicked means',
          options: [
            { id: 'pp-e11-m8a', label: '(a)', text: 'Those raised by chance or wicked means' },
            { id: 'pp-e11-m8b', label: '(b)', text: 'His own teachers' },
            { id: 'pp-e11-m8c', label: '(c)', text: 'Quiet scholars' },
            { id: 'pp-e11-m8d', label: '(d)', text: 'Honest laborers' },
          ],
        },
        {
          id: 'pp-eng11-mcq-9',
          number: 'ix.',
          type: 'mcq',
          text: 'The repeated opening advice in Edgar Guest’s poem urges the reader when things go wrong:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(c) Rest if you must, but do not quit',
          options: [
            { id: 'pp-e11-m9a', label: '(a)', text: 'Abandon the goal immediately' },
            { id: 'pp-e11-m9b', label: '(b)', text: 'Blame friends for bad luck' },
            { id: 'pp-e11-m9c', label: '(c)', text: 'Rest if you must, but do not quit' },
            { id: 'pp-e11-m9d', label: '(d)', text: 'Hide from responsibility' },
          ],
        },
        {
          id: 'pp-eng11-mcq-10',
          number: 'x.',
          type: 'mcq',
          text: 'In "Ozymandias", the final lines describe "the lone and level sands" stretching:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(b) Far away around the decayed wreck',
          options: [
            { id: 'pp-e11-m10a', label: '(a)', text: 'Into a bustling capital' },
            { id: 'pp-e11-m10b', label: '(b)', text: 'Far away around the decayed wreck' },
            { id: 'pp-e11-m10c', label: '(c)', text: 'Toward a royal garden' },
            { id: 'pp-e11-m10d', label: '(d)', text: 'Beneath towering palaces' },
          ],
        },
        {
          id: 'pp-eng11-mcq-11',
          number: 'xi.',
          type: 'mcq',
          text: 'In "Good Timber", the "broken branches" and "scars" on a mountain tree symbolize:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(d) Hardships that forge noble character',
          options: [
            { id: 'pp-e11-m11a', label: '(a)', text: 'Useless decay' },
            { id: 'pp-e11-m11b', label: '(b)', text: 'Lack of sunlight' },
            { id: 'pp-e11-m11c', label: '(c)', text: 'Forest fires only' },
            { id: 'pp-e11-m11d', label: '(d)', text: 'Hardships that forge noble character' },
          ],
        },
        {
          id: 'pp-eng11-mcq-12',
          number: 'xii.',
          type: 'mcq',
          text: 'William Wordsworth’s poem "Lucy Gray" is written in the form of a:',
          marks: 1,
          optionColumns: 4,
          answerKey: '(b) Ballad',
          options: [
            { id: 'pp-e11-m12a', label: '(a)', text: 'Sonnet' },
            { id: 'pp-e11-m12b', label: '(b)', text: 'Ballad' },
            { id: 'pp-e11-m12c', label: '(c)', text: 'Elegy' },
            { id: 'pp-e11-m12d', label: '(d)', text: 'Ode' },
          ],
        },
        {
          id: 'pp-eng11-mcq-13',
          number: 'xiii.',
          type: 'mcq',
          text: 'King John became jealous of the Abbot of Canterbury because of the Abbot’s:',
          marks: 1,
          optionColumns: 2,
          answerKey: '(a) Wealthy hospitality and grand household',
          options: [
            { id: 'pp-e11-m13a', label: '(a)', text: 'Wealthy hospitality and grand household' },
            { id: 'pp-e11-m13b', label: '(b)', text: 'Foreign military alliances' },
            { id: 'pp-e11-m13c', label: '(c)', text: 'Poetry collections' },
            { id: 'pp-e11-m13d', label: '(d)', text: 'Fleet of merchant ships' },
          ],
        },
        {
          id: 'pp-eng11-mcq-14',
          number: 'xiv.',
          type: 'mcq',
          text: 'In "A Visit to a Small Planet", John Randolph wishes to marry:',
          marks: 1,
          optionColumns: 4,
          answerKey: '(c) Ellen Spelding',
          options: [
            { id: 'pp-e11-m14a', label: '(a)', text: 'Mrs. Powers' },
            { id: 'pp-e11-m14b', label: '(b)', text: 'Rosemary' },
            { id: 'pp-e11-m14c', label: '(c)', text: 'Ellen Spelding' },
            { id: 'pp-e11-m14d', label: '(d)', text: 'Clarissa' },
          ],
        },
        {
          id: 'pp-eng11-mcq-15',
          number: 'xv.',
          type: 'mcq',
          text: 'Choose the correct synonym of "resilient":',
          marks: 1,
          optionColumns: 4,
          answerKey: '(b) Adaptable',
          options: [
            { id: 'pp-e11-m15a', label: '(a)', text: 'Fragile' },
            { id: 'pp-e11-m15b', label: '(b)', text: 'Adaptable' },
            { id: 'pp-e11-m15c', label: '(c)', text: 'Stubborn' },
            { id: 'pp-e11-m15d', label: '(d)', text: 'Timid' },
          ],
        },
        {
          id: 'pp-eng11-mcq-16',
          number: 'xvi.',
          type: 'mcq',
          text: 'Select the correct passive form: "The students planted fifty saplings in the courtyard."',
          marks: 1,
          optionColumns: 2,
          answerKey: '(c) Fifty saplings were planted by the students in the courtyard.',
          options: [
            { id: 'pp-e11-m16a', label: '(a)', text: 'Fifty saplings are planted by the students in the courtyard.' },
            { id: 'pp-e11-m16b', label: '(b)', text: 'Fifty saplings have planted by the students in the courtyard.' },
            { id: 'pp-e11-m16c', label: '(c)', text: 'Fifty saplings were planted by the students in the courtyard.' },
            { id: 'pp-e11-m16d', label: '(d)', text: 'Fifty saplings will be planted by the students in the courtyard.' },
          ],
        },
        {
          id: 'pp-eng11-mcq-17',
          number: 'xvii.',
          type: 'mcq',
          text: 'Identify the figure of speech in "The wind whispered secrets through the tall pines."',
          marks: 1,
          optionColumns: 4,
          answerKey: '(b) Personification',
          options: [
            { id: 'pp-e11-m17a', label: '(a)', text: 'Simile' },
            { id: 'pp-e11-m17b', label: '(b)', text: 'Personification' },
            { id: 'pp-e11-m17c', label: '(c)', text: 'Hyperbole' },
            { id: 'pp-e11-m17d', label: '(d)', text: 'Allusion' },
          ],
        },
        {
          id: 'pp-eng11-mcq-18',
          number: 'xviii.',
          type: 'mcq',
          text: 'Choose the accurate preposition: "We must abide ___ the traffic laws for everyone’s safety."',
          marks: 1,
          optionColumns: 4,
          answerKey: '(a) by',
          options: [
            { id: 'pp-e11-m18a', label: '(a)', text: 'by' },
            { id: 'pp-e11-m18b', label: '(b)', text: 'for' },
            { id: 'pp-e11-m18c', label: '(c)', text: 'into' },
            { id: 'pp-e11-m18d', label: '(d)', text: 'upon' },
          ],
        },
        {
          id: 'pp-eng11-mcq-19',
          number: 'xix.',
          type: 'mcq',
          text: 'Which sentence is punctuated correctly?',
          marks: 1,
          optionColumns: 2,
          answerKey: '(b) "Honesty," said the mentor, "builds lasting trust."',
          options: [
            { id: 'pp-e11-m19a', label: '(a)', text: '"Honesty said the mentor builds lasting trust."' },
            { id: 'pp-e11-m19b', label: '(b)', text: '"Honesty," said the mentor, "builds lasting trust."' },
            { id: 'pp-e11-m19c', label: '(c)', text: 'Honesty, "said the mentor", builds lasting trust.' },
            { id: 'pp-e11-m19d', label: '(d)', text: '"Honesty" said the mentor "builds lasting trust".' },
          ],
        },
        {
          id: 'pp-eng11-mcq-20',
          number: 'xx.',
          type: 'mcq',
          text: 'Choose the correct indirect form: He said, "I have completed my assignment."',
          marks: 1,
          optionColumns: 2,
          answerKey: '(b) He said that he had completed his assignment.',
          options: [
            { id: 'pp-e11-m20a', label: '(a)', text: 'He said that he has completed his assignment.' },
            { id: 'pp-e11-m20b', label: '(b)', text: 'He said that he had completed his assignment.' },
            { id: 'pp-e11-m20c', label: '(c)', text: 'He told that I completed my assignment.' },
            { id: 'pp-e11-m20d', label: '(d)', text: 'He says he had completed my assignment.' },
          ],
        },
      ],
    },
    {
      id: 'pp-eng11-sec-b',
      name: 'SECTION "B"',
      subtitle: '(SHORT ANSWER QUESTIONS)',
      marksBadge: '40 Marks',
      instruction: ENG_CLASS11_SECTION_PATTERNS[1].instruction,
      subsections: ['Sub-Section I (Prose)', 'Sub-Section II (Poem)', 'Sub-Section III (Grammar)'],
      questions: [
        {
          id: 'pp-eng11-b1',
          number: 'i.',
          type: 'short',
          subsection: 'Sub-Section I (Prose)',
          text: 'What warning did Quaid-e-Azam issue against jobbery, nepotism, and favoritism in his 11 August 1947 speech?',
          marks: 4,
          answerKey: 'He declared he would never tolerate jobbery or nepotism and vowed to crush anyone exerting undue influence for favors, ensuring merit and fairness.',
        },
        {
          id: 'pp-eng11-b2',
          number: 'ii.',
          type: 'short',
          subsection: 'Sub-Section I (Prose)',
          text: 'Why is conserving freshwater wetlands and forests vital for climate stability in Pakistan?',
          marks: 4,
          answerKey: 'Wetlands recharge groundwater and buffer floods, while forests absorb carbon dioxide, regulate temperatures, and prevent soil erosion.',
        },
        {
          id: 'pp-eng11-b3',
          number: 'iii.',
          type: 'short',
          subsection: 'Sub-Section I (Prose)',
          text: 'How can students verify online news before believing or forwarding it on social platforms?',
          marks: 4,
          answerKey: 'By checking official sources, inspecting publication dates, reading beyond sensational headlines, and cross-checking facts with reputable outlets.',
        },
        {
          id: 'pp-eng11-b4',
          number: 'iv.',
          type: 'short',
          subsection: 'Sub-Section I (Prose)',
          text: 'In what ways do self-grooming and courteous communication enhance an individual’s social and workplace standing?',
          marks: 4,
          answerKey: 'Clean presentation, active listening, polite speech, and punctual habits earn trust, create positive first impressions, and strengthen collaboration.',
        },
        {
          id: 'pp-eng11-b5',
          number: 'v.',
          type: 'short',
          subsection: 'Sub-Section II (Poem)',
          text: 'What qualities keep the happy man free from servile fears and public flattery in "The Character of a Happy Life"?',
          marks: 4,
          answerKey: 'His conscience serves as a retreat, simple truth guides his life, and he relies neither on rumors nor the favor of princes.',
        },
        {
          id: 'pp-eng11-b6',
          number: 'vi.',
          type: 'short',
          subsection: 'Sub-Section II (Poem)',
          text: 'What irony does P.B. Shelley create through the inscription on Ozymandias’ pedestal?',
          marks: 4,
          answerKey: 'The inscription commands the mighty to tremble at his grand empire, yet nothing remains around the broken statue except boundless empty desert.',
        },
        {
          id: 'pp-eng11-b7',
          number: 'vii.',
          type: 'short',
          subsection: 'Sub-Section II (Poem)',
          text: 'Why did the shepherd risk his life to appear before King John on the Abbot of Canterbury’s behalf?',
          marks: 4,
          answerKey: 'Moved by loyalty to his kind master, the shepherd disguised himself in the Abbot’s robe and used quick wit to save both the Abbot’s life and wealth.',
        },
        {
          id: 'pp-eng11-b8',
          number: 'viii.',
          type: 'short',
          subsection: 'Sub-Section II (Poem)',
          text: 'How does Gore Vidal portray Kreton as an affectionate yet detached observer of human civilization?',
          marks: 4,
          answerKey: 'Kreton treats humanity like fascinating characters in an entertaining drama—polite and charmed by their emotions yet untouched by panic or aggression.',
        },
        {
          id: 'pp-eng11-b9',
          number: 'ix.',
          type: 'short',
          subsection: 'Sub-Section III (Grammar)',
          text: 'Change the voice of the following: (a) The librarian issued three rare books to me. (b) Do not waste precious time during examinations.',
          marks: 4,
          answerKey: '(a) Three rare books were issued to me by the librarian. (b) Let precious time not be wasted during examinations.',
        },
        {
          id: 'pp-eng11-b10',
          number: 'x.',
          type: 'short',
          subsection: 'Sub-Section III (Grammar)',
          text: 'Change into indirect narration: (a) The principal said to us, "Discipline is the secret of achievement." (b) She asked her cousin, "Where did you buy this novel?"',
          marks: 4,
          answerKey: '(a) The principal told us that discipline is the secret of achievement. (b) She asked her cousin where he had bought that novel.',
        },
        {
          id: 'pp-eng11-b11',
          number: 'xi.',
          type: 'short',
          subsection: 'Sub-Section III (Grammar)',
          text: 'Fill in the blanks with appropriate prepositions: (a) He congratulated me ___ my board scholarship. (b) The cottage sits ___ the foot of the hills. (c) Always remain faithful ___ your principles.',
          marks: 4,
          answerKey: '(a) on (b) at (c) to',
        },
        {
          id: 'pp-eng11-b12',
          number: 'xii.',
          type: 'short',
          subsection: 'Sub-Section III (Grammar)',
          text: 'Use any TWO of the following idioms in sentences: (a) burn the midnight oil (b) make both ends meet (c) once and for all.',
          marks: 4,
          answerKey: '(a) Students burn the midnight oil before annual exams. (b) Honest families budget wisely to make both ends meet. (c) Let us settle this dispute once and for all.',
        },
        {
          id: 'pp-eng11-b13',
          number: 'xiii.',
          type: 'short',
          subsection: 'Sub-Section III (Grammar)',
          text: 'Do as directed: (a) Although he was tired, he finished the chapter. (Rewrite using "Despite") (b) How inspiring the lecture was! (Change into assertive)',
          marks: 4,
          answerKey: '(a) Despite being tired, he finished the chapter. (b) The lecture was very inspiring.',
        },
      ],
    },
    {
      id: 'pp-eng11-sec-c',
      name: 'SECTION "C"',
      subtitle: '(DETAILED ANSWER QUESTIONS)',
      marksBadge: '40 Marks',
      instruction: ENG_CLASS11_SECTION_PATTERNS[2].instruction,
      questions: [
        {
          id: 'pp-eng11-c1',
          number: '3.',
          type: 'detailed',
          text: 'Read the following unseen passage carefully, make a precis of about one-third of its length with a suitable title, and answer the questions below:\n"Discipline is the quiet architecture behind every lasting achievement. Talent may spark initial excitement, yet without daily consistency even brilliant minds scatter their energy across unfinished goals. Students who manage their hours calmly, separate study time from digital distractions, and review errors patiently develop confidence that carries them steadily from classrooms into professional life."\n(a) Suggest a suitable title and write a precis. (b) Why is talent alone insufficient without discipline? (c) Give three habits of disciplined students mentioned in the passage.',
          marks: 15,
          answerKey: 'Title: Discipline as the Foundation of Success. Precis: Lasting achievement depends more on steady discipline than raw talent; students who plan time, limit digital distractions, and learn from mistakes build lasting confidence. Talent fades without consistency; habits include calm time management, avoiding distractions, and patient review.',
        },
        {
          id: 'pp-eng11-c2',
          number: '4.',
          type: 'detailed',
          text: 'Write a formal application to the Principal of your college requesting permission to set up a Student Environmental Club and tree-plantation drive on campus.',
          marks: 10,
          answerKey: 'Formal college application format with To: The Principal, clear subject, persuasive rationale explaining environmental benefits and student volunteering, and courteous closing.',
        },
        {
          id: 'pp-eng11-c3',
          number: '5.',
          type: 'detailed',
          text: 'Write a well-organized essay (250–300 words) on any ONE of the following topics:\n(a) Role of Civic Sense in Building Clean Cities\n(b) Digital Literacy for Modern Youth\n(c) Importance of Time Management for Students',
          marks: 15,
          answerKey: 'Coherent introduction with thesis, well-developed body paragraphs with concrete examples, clear transitions, accurate grammar, and strong conclusion.',
        },
      ],
    },
  ],
  createdAt: '2025-05-01T00:00:00.000Z',
  updatedAt: '2025-05-01T00:00:00.000Z',
};

export const BUNDLED_PAST_PAPERS: PastPaperRecord[] = [
  {
    id: 'past-cs-2025-science-general',
    title: 'Computer Science 2025 (Science General Group)',
    year: '2025',
    subject: 'Computer Science',
    classGrade: 'Class 11',
    boardOrGroup: 'Science General Group',
    category: 'Computer Science',
    description:
      'Complete 2025 annual board paper: 15 MCQs (15 Marks), 15 Short questions — attempt any 10 (30 Marks), and 5 Detailed questions — attempt any 3 (30 Marks).',
    questionBankId: 'curr-computer-science-class-11',
    sourceImages: [
      '/assets/aistudio/image_4902d929.png',
      '/assets/aistudio/image_7abf2186.png',
      '/assets/aistudio/image_67710ae8.png',
    ],
    sectionPatterns: CS_2025_SECTION_PATTERNS,
    paper: CS_2025_EXAM_PAPER,
    createdAt: '2025-05-01T00:00:00.000Z',
    isBuiltIn: true,
  },
  {
    id: 'past-eng-biek-class11',
    title: 'English Class 11 (BIEK Pattern)',
    year: '2025',
    subject: 'English',
    classGrade: 'Class 11',
    boardOrGroup: 'BIEK Karachi (All Groups)',
    category: 'English',
    description:
      'Standard 100-mark Class 11 English Compulsory paper: 20 MCQs (20 Marks), Section B with Prose, Poem & Grammar sub-sections — attempt any 10 of 13 (40 Marks), and Section C Detailed Composition & Precis (40 Marks).',
    questionBankId: 'curr-english-class-11',
    sectionPatterns: ENG_CLASS11_SECTION_PATTERNS,
    paper: ENG_CLASS11_EXAM_PAPER,
    createdAt: '2025-05-01T00:00:00.000Z',
    isBuiltIn: true,
  },
];

export function getCustomPastPapers(): PastPaperRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PAST_PAPERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAllPastPapers(): PastPaperRecord[] {
  return [...BUNDLED_PAST_PAPERS, ...getCustomPastPapers()];
}

export function saveCustomPastPaper(record: PastPaperRecord): PastPaperRecord[] {
  const existing = getCustomPastPapers().filter((p) => p.id !== record.id);
  const updated = [{ ...record, isBuiltIn: false }, ...existing];
  localStorage.setItem(CUSTOM_PAST_PAPERS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteCustomPastPaper(id: string): PastPaperRecord[] {
  const updated = getCustomPastPapers().filter((p) => p.id !== id);
  localStorage.setItem(CUSTOM_PAST_PAPERS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function createPastPaperRecordFromPaper(
  paper: ExamPaper,
  meta: {
    year: string;
    subject: string;
    classGrade: string;
    boardOrGroup: string;
    category: PastPaperRecord['category'];
  }
): PastPaperRecord {
  const sectionPatterns: PastPaperSectionPattern[] = paper.sections.map((sec) => {
    const firstType = sec.questions[0]?.type;
    const kind: 'mcq' | 'short' | 'detailed' =
      firstType === 'mcq' || firstType === 'fill_blank' || firstType === 'true_false'
        ? 'mcq'
        : firstType === 'detailed'
        ? 'detailed'
        : 'short';

    const marksPerQuestion =
      sec.questions[0]?.marks || (kind === 'mcq' ? 1 : kind === 'detailed' ? 10 : 3);
    const questionMarksList = sec.questions.map((q) => q.marks || marksPerQuestion);
    const hasMixedMarks = questionMarksList.some((m) => m !== marksPerQuestion);

    const badgeDigits = parseInt((sec.marksBadge || '').replace(/[^0-9]/g, ''), 10);
    const totalSectionMarks =
      Number.isFinite(badgeDigits) && badgeDigits > 0
        ? badgeDigits
        : sec.questions.reduce((acc, q) => acc + (q.marks || marksPerQuestion), 0);
    const attemptCount =
      marksPerQuestion > 0
        ? Math.min(sec.questions.length, Math.max(1, Math.round(totalSectionMarks / marksPerQuestion)))
        : sec.questions.length;

    const subsectionPatterns: PastPaperSubsectionPattern[] = [];
    sec.questions.forEach((q) => {
      const subTitle = (q.subsection || '').trim();
      if (!subTitle) return;
      const existingSub = subsectionPatterns.find((s) => s.title === subTitle);
      if (existingSub) {
        existingSub.questionCount += 1;
      } else {
        const lower = subTitle.toLowerCase();
        const hints = lower.includes('prose')
          ? ['prose']
          : lower.includes('poem') || lower.includes('poetry')
          ? ['poem', 'poetry', 'play']
          : lower.includes('grammar')
          ? ['grammar']
          : [lower];
        subsectionPatterns.push({
          title: subTitle,
          ...(q.subsectionInstruction ? { instruction: q.subsectionInstruction } : {}),
          questionCount: 1,
          marksPerQuestion: q.marks || marksPerQuestion,
          matchHints: hints,
        });
      }
    });

    return {
      name: sec.name,
      subtitle: sec.subtitle,
      kind,
      questionCount: sec.questions.length,
      attemptCount,
      marksPerQuestion,
      ...(hasMixedMarks ? { marksPerQuestionList: questionMarksList } : {}),
      totalSectionMarks,
      marksBadge: sec.marksBadge || `${totalSectionMarks} Marks`,
      instruction: sec.instruction || '',
      numberingStyle:
        kind === 'detailed' && sec.questions[0]?.number?.trim().startsWith('3')
          ? 'section-c-from-3'
          : 'roman',
      ...(subsectionPatterns.length > 0 ? { subsectionPatterns } : {}),
    };
  });

  const clonedPaper = JSON.parse(JSON.stringify(paper)) as ExamPaper;
  const now = new Date().toISOString();
  const id = `past-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  return {
    id,
    title: `${meta.subject} ${meta.year}${meta.boardOrGroup ? ` (${meta.boardOrGroup})` : ''}`,
    year: meta.year,
    subject: meta.subject,
    classGrade: meta.classGrade,
    boardOrGroup: meta.boardOrGroup,
    category: meta.category,
    description: sectionPatterns
      .map(
        (sp) =>
          `${sp.questionCount} ${sp.kind.toUpperCase()} (${
            sp.attemptCount < sp.questionCount ? `Attempt ${sp.attemptCount}` : 'All'
          }, ${sp.totalSectionMarks}m)`
      )
      .join(' • '),
    sectionPatterns,
    paper: {
      ...clonedPaper,
      id,
      updatedAt: now,
    },
    createdAt: now,
    isBuiltIn: false,
  };
}
