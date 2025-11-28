import { readFileSync, writeFileSync } from 'fs';

const filePath = 'c:\\Users\\Rico Zmarzly\\OneDrive\\Bees\\Apps\\beekeeper-app\\tests\\app\\dashboard\\hives.test.tsx';
let content = readFileSync(filePath, 'utf8');

// Lines where tests start that need fixing
const testsToFix = [
  { line: 674, testName: 'should verify auth session exists before insert' },
  { line: 761, testName: 'should throw error if no active session found' },
  { line: 830, testName: 'should successfully insert hive with user_id when RLS policies are permissive' },
  { line: 936, testName: 'should allow SELECT operations with permissive RLS policy' },
  { line: 1006, testName: 'should enforce application-layer security by filtering queries with user_id' }
];

// Add auth/rpc setup before each render call and fix selectors
const fixes = [
  // Add onAuthStateChange to existing auth mocks
  {
    search: /vi\.mocked\(mockSupabaseClient\)\.auth = \{[^}]+getSession[^}]+\}/g,
    replace: (match) => {
      if (match.includes('onAuthStateChange')) return match;
      return match.replace(/\}$/, `,
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      }`)
    }
  },
  // Fix getByLabelText to getByPlaceholderText for hive number
  {
    search: /screen\.getByLabelText\(\/hive number\/i\)/g,
    replace: "screen.getByPlaceholderText('e.g., A-1, B-3')"
  },
  // Fix getByLabelText for apiary
  {
    search: /screen\.getByLabelText\(\/apiary.*?\/i\)/g,
    replace: `screen.getAllByRole('combobox').find((select: HTMLElement) =>
        (select as HTMLSelectElement).required &&
        select.querySelector('option[value=""]')?.textContent === 'Select apiary'
      ) as HTMLSelectElement`
  }
];

for (const fix of fixes) {
  if (fix.replace instanceof Function) {
    content = content.replace(fix.search, fix.replace);
  } else {
    content = content.replace(fix.search, fix.replace);
  }
}

writeFileSync(filePath, content, 'utf8');
console.log('Fixed remaining tests');
