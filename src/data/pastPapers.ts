import { ExamPaper, PastPaperRecord, PastPaperSectionPattern } from '../types/exam';

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
    const badgeDigits = parseInt((sec.marksBadge || '').replace(/[^0-9]/g, ''), 10);
    const totalSectionMarks =
      Number.isFinite(badgeDigits) && badgeDigits > 0
        ? badgeDigits
        : sec.questions.reduce((acc, q) => acc + (q.marks || marksPerQuestion), 0);
    const attemptCount =
      marksPerQuestion > 0
        ? Math.min(sec.questions.length, Math.max(1, Math.round(totalSectionMarks / marksPerQuestion)))
        : sec.questions.length;

    return {
      name: sec.name,
      subtitle: sec.subtitle,
      kind,
      questionCount: sec.questions.length,
      attemptCount,
      marksPerQuestion,
      totalSectionMarks,
      marksBadge: sec.marksBadge || `${totalSectionMarks} Marks`,
      instruction: sec.instruction || '',
      numberingStyle:
        kind === 'detailed' && sec.questions[0]?.number?.trim().startsWith('3')
          ? 'section-c-from-3'
          : 'roman',
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
