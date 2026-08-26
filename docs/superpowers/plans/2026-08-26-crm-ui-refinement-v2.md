# CRM UI Refinement v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ປັບ CRM UI ເປັນ Clean White + Soft Glassy, ສ້າງ shared accessible controls, ປັບ terminology/Customer Meeting purpose/contact actions ແລະຮອງຮັບ mobile 320px ໂດຍບໍ່ປ່ຽນ Auth, branch/query/security/permission behavior.

**Architecture:** ສ້າງ lightweight in-repo design system ຈາກ CSS tokens ແລະ controlled React components. Custom Select/Searchable Select ໃຊ້ portal/listbox semantics; DateField ຮັກສາ native date picker; screen components ປ່ຽນສະເພາະ presentation ແລະ local form mapping ໂດຍຄົງ services, queries, Functions ແລະ Rules ເດີມ.

**Tech Stack:** React 19.2, React Router 7.18, React DOM portals, Vite 8, Firebase Web SDK 12.18, Tailwind CSS 3.4, plain CSS custom properties, Material Symbols, Vitest 4.1, React Testing Library 16.3, user-event 14.6.

**Spec:** `docs/superpowers/specs/2026-08-26-crm-ui-refinement-v2-design.md`

## Global Constraints

- Baseline is branch `codex/crm-ux-refinement` at `10ad1d469f90f3edcf18b42aa7f268d19b62e742`.
- Do not change `functions/**`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`, Auth lifecycle, `src/services/queryScope.js`, `src/shared/permissions.js`, branch visibility, query constraints, Security Rules, or activity permissions.
- Keep internal values `customer_visit` and `in_progress` unchanged.
- Display `customer_visit` as `ນັດພົບລູກຄ້າ`; display `in_progress` as `ກຳລັງດຳເນີນ`.
- Write Customer Meeting purpose to `purpose`; read legacy `visitPurpose` only as fallback; do not delete or unset legacy Firestore data.
- Use only White/Teal/Gray/Black plus Orange for warning/destructive/error.
- Keep motion between 150–220ms and cap backdrop blur at 12px; honor `prefers-reduced-motion`.
- All interactive touch targets are at least 44×44px.
- Support 320, 360, 390, and 430px without horizontal overflow.
- Do not add a runtime dependency unless a separate review proves it necessary; the planned implementation adds none.
- Do not deploy production in implementation. Hosting preview/live/rollback commands in Task 10 are release instructions for a later separately approved phase.

---

### Task 1: Design tokens and primitive shared components

**Files:**

- Create: `src/styles/tokens.css`
- Create: `src/styles/components.css`
- Create: `src/styles/screens.css`
- Create: `src/components/ui/Button.jsx`
- Create: `src/components/ui/Button.test.jsx`
- Create: `src/components/ui/IconButton.jsx`
- Create: `src/components/ui/IconButton.test.jsx`
- Create: `src/components/ui/Input.jsx`
- Create: `src/components/ui/Textarea.jsx`
- Create: `src/components/ui/FormControls.test.jsx`
- Create: `src/components/ui/GlassCard.jsx`
- Create: `src/components/ui/GlassCard.test.jsx`
- Create: `src/components/ui/StatusBadge.jsx`
- Create: `src/components/ui/StatusBadge.test.jsx`
- Modify: `src/main.jsx`
- Modify: `src/index.css`

**Interfaces:**

- Produces `Button({ variant, size, busy, type, className, children, ...buttonProps })`.
- Produces `IconButton({ label, tone, size, href, className, children, ...props })`.
- Produces `Input({ id, label, error, hint, className, ...inputProps })`.
- Produces `Textarea({ id, label, error, hint, className, ...textareaProps })`.
- Produces `GlassCard({ as, variant, className, children, ...props })`.
- Produces `StatusBadge({ kind, value, label, className })`.
- CSS imports must remain `index.css` → `tokens.css` → `components.css` → `screens.css`.

- [ ] **Step 1: Write failing component contract tests**

Add focused tests that prove semantics, defaults, accessible names, error relationships and stored-value data attributes:

```jsx
// src/components/ui/FormControls.test.jsx
render(<Input id="name" label="ຊື່" error="ຕ້ອງລະບຸ" value="" onChange={() => {}} />);
const input = screen.getByLabelText('ຊື່');
expect(input).toHaveAttribute('aria-invalid', 'true');
expect(input).toHaveAccessibleDescription('ຕ້ອງລະບຸ');

render(<Textarea id="note" label="ໝາຍເຫດ" hint="ບໍ່ບັງຄັບ" value="" onChange={() => {}} />);
expect(screen.getByLabelText('ໝາຍເຫດ')).toHaveAccessibleDescription('ບໍ່ບັງຄັບ');
```

```jsx
// src/components/ui/Button.test.jsx
render(<Button variant="primary">ບັນທຶກ</Button>);
expect(screen.getByRole('button', { name: 'ບັນທຶກ' })).toHaveAttribute('type', 'button');
expect(screen.getByRole('button')).toHaveClass('ui-button--primary');
```

```jsx
// src/components/ui/StatusBadge.test.jsx
render(<StatusBadge kind="activity" value="in_progress" label="ກຳລັງດຳເນີນ" />);
expect(screen.getByText('ກຳລັງດຳເນີນ')).toHaveAttribute('data-status', 'in_progress');
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```powershell
npm.cmd test -- src/components/ui/Button.test.jsx src/components/ui/IconButton.test.jsx src/components/ui/FormControls.test.jsx src/components/ui/GlassCard.test.jsx src/components/ui/StatusBadge.test.jsx
```

Expected: FAIL because the `src/components/ui/*` modules do not exist.

- [ ] **Step 3: Implement the smallest semantic primitives**

Use controlled, forward-prop components. Keep `Button` default type safe and expose exact variants:

```jsx
export default function Button({ variant = 'primary', size = 'md', busy = false, type = 'button', className = '', children, disabled, ...props }) {
  return <button type={type} className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} disabled={disabled || busy} aria-busy={busy || undefined} {...props}>{children}</button>;
}
```

Implement `IconButton` as `<a>` only when `href` exists, otherwise `<button type="button">`. Implement `Input`/`Textarea` with generated description IDs `${id}-hint` and `${id}-error`. Implement `GlassCard` with `const Component = as`, and `StatusBadge` with `data-kind`/`data-status` so CSS never changes stored values.

- [ ] **Step 4: Add exact tokens and CSS layering**

Define all values from the spec in `tokens.css`, including:

```css
:root {
  --color-white: #fff;
  --surface-page: #f7faf9;
  --surface-glass: rgb(255 255 255 / .82);
  --teal-700: #0f766e;
  --teal-600: #0d9488;
  --teal-500: #14b8a6;
  --teal-100: #ccfbf1;
  --teal-50: #f0fdfa;
  --ink-950: #0a0f0e;
  --ink-800: #1f2937;
  --gray-600: #5f6b69;
  --gray-400: #94a3a0;
  --gray-200: #dde5e3;
  --gray-100: #edf2f1;
  --orange-700: #c2410c;
  --orange-600: #ea580c;
  --orange-100: #ffedd5;
  --orange-50: #fff7ed;
  --touch-target: 44px;
  --motion-fast: 150ms;
  --motion-base: 180ms;
  --motion-slow: 220ms;
}
```

Import the three style sheets after `index.css` in `src/main.jsx`; do not import or edit `src/App.css`.

- [ ] **Step 5: Verify the primitive layer**

Run:

```powershell
npm.cmd test -- src/components/ui/Button.test.jsx src/components/ui/IconButton.test.jsx src/components/ui/FormControls.test.jsx src/components/ui/GlassCard.test.jsx src/components/ui/StatusBadge.test.jsx
npm.cmd run lint
```

Expected: all focused tests PASS and lint exits 0.

- [ ] **Step 6: Commit checkpoint**

```powershell
git add src/main.jsx src/index.css src/styles src/components/ui/Button.jsx src/components/ui/Button.test.jsx src/components/ui/IconButton.jsx src/components/ui/IconButton.test.jsx src/components/ui/Input.jsx src/components/ui/Textarea.jsx src/components/ui/FormControls.test.jsx src/components/ui/GlassCard.jsx src/components/ui/GlassCard.test.jsx src/components/ui/StatusBadge.jsx src/components/ui/StatusBadge.test.jsx
git commit -m "feat: add CRM v2 design system primitives"
```

---

### Task 2: Accessible Custom Select and Searchable Select

**Files:**

- Create: `src/components/ui/CustomSelect.jsx`
- Create: `src/components/ui/CustomSelect.test.jsx`
- Create: `src/components/ui/SearchableSelect.jsx`
- Create: `src/components/ui/SearchableSelect.test.jsx`
- Modify: `src/styles/components.css`
- Modify: `src/styles/screens.css`
- Modify: `src/test/setup.js`

**Interfaces:**

- Produces `CustomSelect({ id, label, value, options, onChange, placeholder, disabled, required, error, compact, className })`.
- `options` is `Array<{ value: string, label: string, disabled?: boolean, searchText?: string }>`.
- `onChange(nextValue)` receives a string, never a DOM event.
- `SearchableSelect(props)` composes `CustomSelect` with `searchable` enabled and adds `searchPlaceholder`.
- Popup rendering uses `createPortal`; no visible native `<select>` is allowed.
- Both components forward a `ref` to the active trigger/input; consumers call `ref.current.focus()` after validation errors.

- [ ] **Step 1: Write failing mouse, keyboard and portal tests**

Cover open/selection, outside close, disabled behavior, focus restore and touch-equivalent pointer events:

```jsx
const options = [
  { value: 'planned', label: 'ວາງແຜນ' },
  { value: 'in_progress', label: 'ກຳລັງດຳເນີນ' },
  { value: 'completed', label: 'ສຳເລັດແລ້ວ' },
];

const onChange = vi.fn();
render(<CustomSelect id="status" label="ສະຖານະ" value="planned" options={options} onChange={onChange} />);
const trigger = screen.getByRole('combobox', { name: 'ສະຖານະ' });
await user.click(trigger);
await user.click(screen.getByRole('option', { name: 'ກຳລັງດຳເນີນ' }));
expect(onChange).toHaveBeenCalledWith('in_progress');
expect(trigger).toHaveFocus();
```

```jsx
trigger.focus();
await user.keyboard('{ArrowDown}{End}{Enter}');
expect(onChange).toHaveBeenCalledWith('completed');
await user.keyboard('{ArrowDown}{Escape}');
expect(onChange).toHaveBeenCalledTimes(1);
expect(trigger).toHaveFocus();
```

Use `fireEvent.pointerDown(option, { pointerType: 'touch' })` followed by click to prove touch does not select twice.

- [ ] **Step 2: Write failing searchable behavior tests**

```jsx
render(<SearchableSelect id="customer" label="ລູກຄ້າ" value="" options={[
  { value: 'c1', label: 'ຮ້ານ ກ · 020 1111' },
  { value: 'c2', label: 'ຮ້ານ ຂ · 020 2222' },
]} onChange={onChange} searchPlaceholder="ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ" />);
await user.click(screen.getByRole('combobox', { name: 'ລູກຄ້າ' }));
await user.type(screen.getByPlaceholderText('ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ'), '2222');
expect(screen.queryByRole('option', { name: /1111/ })).not.toBeInTheDocument();
expect(screen.getByRole('option', { name: /2222/ })).toBeInTheDocument();
```

Also test Lao empty state, `aria-expanded`, `aria-controls`, `aria-selected`, `aria-required`, disabled options, Home/End, Tab close and Escape without value mutation.

- [ ] **Step 3: Run the select tests and verify RED**

```powershell
npm.cmd test -- src/components/ui/CustomSelect.test.jsx src/components/ui/SearchableSelect.test.jsx
```

Expected: FAIL because the select modules do not exist.

- [ ] **Step 4: Implement one shared select engine**

Implement `CustomSelect` with internal `searchable` support; `SearchableSelect` is a thin wrapper:

```jsx
// src/components/ui/SearchableSelect.jsx
import CustomSelect from './CustomSelect';

export default function SearchableSelect(props) {
  return <CustomSelect {...props} searchable />;
}
```

In `CustomSelect`, keep `open`, `query`, `activeIndex`, trigger/input refs and portal coordinates local. The non-searchable variant renders one button trigger with `role="combobox"`; the searchable variant renders one text-input trigger with `role="combobox"` and `aria-autocomplete="list"`; never render two combobox roles for one control. Attach `resize`, capture-phase `scroll`, pointer-down-outside and key listeners only while open, and remove them in effect cleanup. When `window.matchMedia('(max-width: 430px)')` matches, apply `ui-select-popover--sheet`; otherwise choose top/bottom from `getBoundingClientRect()`.

Required state transitions:

```jsx
const choose = (option) => {
  if (option.disabled) return;
  onChange(option.value);
  setOpen(false);
  setQuery('');
  requestAnimationFrame(() => triggerRef.current?.focus());
};
```

- [ ] **Step 5: Add setup support and responsive styles**

Keep the existing `ResizeObserver` shim and add a stable `matchMedia` shim only when absent. Style trigger/listbox/options with 44px minimum targets, `max-height: min(320px, calc(100dvh - 32px))`, portal z-index, focus-visible ring, selected checkmark, mobile sheet safe-area padding and opaque fallback before blur.

- [ ] **Step 6: Verify select contracts**

```powershell
npm.cmd test -- src/components/ui/CustomSelect.test.jsx src/components/ui/SearchableSelect.test.jsx
npm.cmd run lint
```

Expected: all select tests PASS, no act warnings, no leaked portal nodes/listeners.

- [ ] **Step 7: Commit checkpoint**

```powershell
git add src/components/ui/CustomSelect.jsx src/components/ui/CustomSelect.test.jsx src/components/ui/SearchableSelect.jsx src/components/ui/SearchableSelect.test.jsx src/styles/components.css src/styles/screens.css src/test/setup.js
git commit -m "feat: add accessible custom select controls"
```

---

### Task 3: DateField and reusable Modal/Bottom Sheet

**Files:**

- Create: `src/components/ui/DateField.jsx`
- Create: `src/components/ui/DateField.test.jsx`
- Create: `src/components/ui/ModalSheet.jsx`
- Create: `src/components/ui/ModalSheet.test.jsx`
- Modify: `src/styles/components.css`
- Modify: `src/styles/screens.css`

**Interfaces:**

- Produces `DateField({ id, type, label, value, onChange, error, hint, min, max, required, disabled })` where `type` is only `date` or `datetime-local`.
- Produces `ModalSheet({ open, onClose, title, description, mobileSheet, initialFocusRef, children, footer })`.
- `ModalSheet` traps focus, closes on Escape/backdrop, restores the previously focused element and locks body scroll only while open.

- [ ] **Step 1: Write failing DateField tests**

```jsx
const showPicker = vi.fn();
HTMLInputElement.prototype.showPicker = showPicker;
render(<DateField id="start" type="datetime-local" label="ເລີ່ມ" value="2026-08-26T09:00" onChange={onChange} />);
expect(screen.getByLabelText('ເລີ່ມ')).toHaveAttribute('type', 'datetime-local');
await user.click(screen.getByRole('button', { name: 'ເປີດປະຕິທິນ ເລີ່ມ' }));
expect(showPicker).toHaveBeenCalledOnce();
```

Add a fallback test where `showPicker` is absent and the input receives focus.

- [ ] **Step 2: Write failing dialog/focus tests**

```jsx
render(<><button>ກ່ອນເປີດ</button><ModalSheet open onClose={onClose} title="ສ້າງໃໝ່"><button>ຕົວເລືອກ</button><button>ປິດ</button></ModalSheet></>);
expect(screen.getByRole('dialog', { name: 'ສ້າງໃໝ່' })).toBeInTheDocument();
await user.keyboard('{Escape}');
expect(onClose).toHaveBeenCalledOnce();
```

Test Tab/Shift+Tab wrapping, backdrop click, content click not closing, body overflow lock and focus restoration after rerender with `open={false}`.

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
npm.cmd test -- src/components/ui/DateField.test.jsx src/components/ui/ModalSheet.test.jsx
```

Expected: FAIL because both modules are absent.

- [ ] **Step 4: Implement DateField and ModalSheet**

Use native input values unchanged; no date parsing occurs in `DateField`. Keep Laos date conversion in `src/shared/dateTime.js` consumers. In `ModalSheet`, collect enabled focusable controls inside the dialog, call `event.preventDefault()` only when wrapping focus, and render nothing when `open` is false.

- [ ] **Step 5: Verify and commit**

```powershell
npm.cmd test -- src/components/ui/DateField.test.jsx src/components/ui/ModalSheet.test.jsx
npm.cmd run lint
git add src/components/ui/DateField.jsx src/components/ui/DateField.test.jsx src/components/ui/ModalSheet.jsx src/components/ui/ModalSheet.test.jsx src/styles/components.css src/styles/screens.css
git commit -m "feat: add themed date and modal sheet controls"
```

Expected: focused tests and lint PASS before commit.

---

### Task 4: Terminology and Customer Meeting single-purpose compatibility

**Files:**

- Modify: `src/shared/constants.js`
- Modify: `src/shared/constants.test.js`
- Modify: `src/shared/validation.js`
- Modify: `src/shared/validation.test.js`
- Modify: `src/activities/ActivityForm.jsx`
- Modify: `src/activities/ActivityForm.test.jsx`
- Modify: `src/activities/ActivityDetailPage.jsx`
- Modify: `src/components/QuickCreate.jsx`
- Modify: `src/components/QuickCreate.test.jsx`
- Modify: `src/customers/CustomerDetailPage.jsx`
- Modify: `src/pages/Home.jsx`

**Interfaces:**

- `activityTypeLabel('customer_visit')` returns `ນັດພົບລູກຄ້າ`.
- `activityStatusLabel('in_progress')` continues returning `ກຳລັງດຳເນີນ`.
- `ActivityForm` submits `purpose` and never submits `visitPurpose`.
- Legacy edit initialization uses `initial.purpose ?? initial.visitPurpose ?? ''`.
- `customer_visit` route/internal value remains unchanged.

- [ ] **Step 1: Update tests first for exact copy and internal values**

```js
expect(activityTypeLabel('customer_visit')).toBe('ນັດພົບລູກຄ້າ');
expect(activityStatusLabel('in_progress')).toBe('ກຳລັງດຳເນີນ');
expect(ACTIVITY_TYPES.CUSTOMER_VISIT).toBe('customer_visit');
expect(ACTIVITY_STATUSES).toContain('in_progress');
```

Change the required-customer validation expectation to:

```js
expect(validateActivity({ ...base, type: 'customer_visit', customerId: '' }).errors.customerId)
  .toBe('ນັດພົບລູກຄ້າຕ້ອງເລືອກລູກຄ້າ');
```

- [ ] **Step 2: Add failing form compatibility tests**

Render a legacy activity with `{ visitPurpose: 'legacy purpose' }` and assert:

```jsx
expect(screen.getByLabelText('ຈຸດປະສົງການນັດພົບ')).toHaveValue('legacy purpose');
expect(screen.queryByLabelText('ຈຸດປະສົງ')).not.toBeInTheDocument();
```

Submit a valid Customer Meeting and assert:

```jsx
expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
  type: 'customer_visit',
  purpose: 'ສະເໜີສິນຄ້າ',
}));
expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('visitPurpose');
```

For Appointment/Event, assert one general label `ຈຸດປະສົງ` remains.

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
npm.cmd test -- src/shared/constants.test.js src/shared/validation.test.js src/activities/ActivityForm.test.jsx src/components/QuickCreate.test.jsx
```

Expected: copy and single-purpose assertions FAIL against current code.

- [ ] **Step 4: Implement canonical mapping without data deletion**

Initialize the canonical field before state is created and strip legacy data from the UI payload:

```jsx
const initialPurpose = initial.purpose ?? initial.visitPurpose ?? '';
const [values, setValues] = useState({
  type,
  title: '',
  status: 'planned',
  branchId: '010',
  location: '',
  purpose: initialPurpose,
  note: '',
  customerId: '',
  assignedStaffIds: [currentUid].filter(Boolean),
  preVisitNotes: '',
  visitNotes: '',
  result: '',
  followUpRequired: false,
  nextAction: '',
  ...initial,
  purpose: initialPurpose,
  productServicesText: Array.isArray(initial.productServices)
    ? initial.productServices.join(', ')
    : initial.productServicesText || '',
  startAt: toInputDateTime(initial.startAt) || initial.startAt || '',
  endAt: toInputDateTime(initial.endAt) || initial.endAt || '',
  followUpDate: toInputDateTime(initial.followUpDate) || initial.followUpDate || '',
});

const submit = (event) => {
  event.preventDefault();
  const payload = { ...values };
  delete payload.visitPurpose;
  onSubmit({
    ...payload,
    type,
    startAt: fromLaosDateTimeInput(values.startAt).toISOString(),
    endAt: fromLaosDateTimeInput(values.endAt).toISOString(),
    customerId: values.customerId || null,
    productServices: values.productServicesText.split(',').map((item) => item.trim()).filter(Boolean),
    followUpDate: values.followUpRequired && values.followUpDate
      ? fromLaosDateTimeInput(values.followUpDate).toISOString()
      : null,
  });
};
```

Render exactly one purpose field by type. Keep `ActivityDetailPage` fallback `activity.purpose || activity.visitPurpose || '—'`. Do not remove `visitPurpose` from `activityModel.js`, Functions validators or Firestore records.

- [ ] **Step 5: Replace all approved display copy**

Update Quick Create, Customer Detail action/history, Home summary, visit note/result labels and validation text. Keep every route containing `/customer_visit` unchanged.

- [ ] **Step 6: Verify terminology and compatibility**

```powershell
npm.cmd test -- src/shared/constants.test.js src/shared/validation.test.js src/activities/ActivityForm.test.jsx src/components/QuickCreate.test.jsx
rg -n "ການຢ້ຽມຢາມລູກຄ້າ|ການຢ້ຽມລູກຄ້າ|ຢ້ຽມລູກຄ້າ" src --glob "*.js" --glob "*.jsx" --glob "!*.test.*"
rg -n "customer_visit" src
```

Expected: tests PASS; first `rg` returns no production UI matches; second `rg` still shows internal keys/routes/tests.

- [ ] **Step 7: Commit checkpoint**

```powershell
git add src/shared/constants.js src/shared/constants.test.js src/shared/validation.js src/shared/validation.test.js src/activities/ActivityForm.jsx src/activities/ActivityForm.test.jsx src/activities/ActivityDetailPage.jsx src/components/QuickCreate.jsx src/components/QuickCreate.test.jsx src/customers/CustomerDetailPage.jsx src/pages/Home.jsx
git commit -m "fix: unify customer meeting terminology and purpose"
```

---

### Task 5: Customer, Admin and form select adoption

**Files:**

- Modify: `src/components/CustomerCard.jsx`
- Modify: `src/components/CustomerCard.test.jsx`
- Modify: `src/customers/CustomerForm.jsx`
- Modify: `src/customers/CustomerForm.test.jsx`
- Modify: `src/customers/CustomerFilters.jsx`
- Modify: `src/customers/CustomersPage.jsx`
- Modify: `src/customers/CustomerDetailPage.jsx`
- Create: `src/customers/CustomerDetailPage.test.jsx`
- Modify: `src/admin/AdminPage.jsx`
- Modify: `src/admin/AdminPage.test.jsx`
- Modify: `src/pages/Login.jsx`
- Modify: `src/pages/Profile.jsx`
- Modify: `src/pages/Profile.test.jsx`
- Modify: `src/components/CameraUpload.jsx`

**Interfaces:**

- Customer status/priority/branch/transfer and Admin role/branch use `CustomSelect`.
- `CustomerCard` calls `onStatusChange(customer.id, nextValue)` exactly as before.
- Admin save/reactivate calls remain `approveUser(uid, role, branchId)`, `reactivateUser(uid, role, branchId)` or `updateUserAccess(uid, role, branchId)` exactly as before.
- `CustomerForm` submit values retain exact stored status, priority and branch values.

- [ ] **Step 1: Convert existing tests to user-visible custom-select behavior before production code**

Replace `fireEvent.change`/`user.selectOptions` with accessible interactions:

```jsx
await user.click(screen.getByRole('combobox', { name: /Status for Test Customer/ }));
await user.click(screen.getByRole('option', { name: 'ຕິດຕາມຕໍ່' }));
expect(onStatusChange).toHaveBeenCalledWith('c1', 'ຕິດຕາມຕໍ່');
```

```jsx
const [role, branch] = screen.getAllByRole('combobox');
await user.click(role);
await user.click(screen.getByRole('option', { name: 'ຫົວໜ້າສາຂາ' }));
await user.click(branch);
await user.click(screen.getByRole('option', { name: /020/ }));
```

Add assertions that non-Admin create forms still hide branch selection and disabled Admin branch selection remains disabled when role is Admin.

- [ ] **Step 2: Add Customer Detail transfer regression test**

Mock `getCustomer`, `subscribeActivities`, `transferCustomer` and `useAuth`; open transfer branch CustomSelect, choose branch `019`, accept `window.confirm`, click `Transfer customer`, then assert:

```jsx
expect(transferCustomer).toHaveBeenCalledWith('c1', '019');
expect(screen.getByRole('combobox', { name: 'Transfer branch' })).toHaveTextContent('— Select —');
```

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
npm.cmd test -- src/components/CustomerCard.test.jsx src/customers/CustomerForm.test.jsx src/customers/CustomerDetailPage.test.jsx src/admin/AdminPage.test.jsx src/pages/Profile.test.jsx
```

Expected: custom-select interactions FAIL until consumers are migrated.

- [ ] **Step 4: Migrate the seven Customer/Admin select surfaces**

Map constants to exact option objects:

```jsx
const statusOptions = CUSTOMER_STATUSES.map((value) => ({ value, label: value }));
const priorityOptions = PRIORITIES.map((value) => ({ value, label: value }));
const branchOptions = BRANCHES.map((branch) => ({ value: branch.id, label: branch.label }));
const roleOptions = Object.values(ROLES).map((value) => ({ value, label: roleLabel(value) }));
```

For each consumer, replace `event.target.value` with `nextValue`. Preserve state defaults and all service calls. Use `compact` CustomerCard status presentation and regular controls elsewhere.

- [ ] **Step 5: Adopt shared form/card primitives**

Replace visible text inputs/textarea/buttons/cards in Customer Form, Customer filters, Login, Profile and Admin with `Input`, `Textarea`, `Button`, `GlassCard` where it does not change routing or service calls. Keep CameraUpload’s file input and accessible camera button; change only its surface classes/tokens.

- [ ] **Step 6: Verify customer/admin flows**

```powershell
npm.cmd test -- src/components/CustomerCard.test.jsx src/customers/CustomerForm.test.jsx src/customers/CustomerDetailPage.test.jsx src/admin/AdminPage.test.jsx src/pages/Profile.test.jsx
npm.cmd test -- src/services/adminService.test.js src/services/queryScope.test.js src/shared/permissions.test.js
npm.cmd run lint
```

Expected: UI and service/scope/permission regressions PASS.

- [ ] **Step 7: Commit checkpoint**

```powershell
git add src/components/CustomerCard.jsx src/components/CustomerCard.test.jsx src/components/CameraUpload.jsx src/customers/CustomerForm.jsx src/customers/CustomerForm.test.jsx src/customers/CustomerFilters.jsx src/customers/CustomersPage.jsx src/customers/CustomerDetailPage.jsx src/customers/CustomerDetailPage.test.jsx src/admin/AdminPage.jsx src/admin/AdminPage.test.jsx src/pages/Login.jsx src/pages/Profile.jsx src/pages/Profile.test.jsx
git commit -m "feat: adopt shared controls across customer and admin UI"
```

---

### Task 6: Activity form, filters and calendar adoption

**Files:**

- Modify: `src/activities/ActivityForm.jsx`
- Modify: `src/activities/ActivityForm.test.jsx`
- Modify: `src/activities/ActivitiesPage.jsx`
- Create: `src/activities/ActivitiesPage.test.jsx`
- Modify: `src/activities/CalendarPage.jsx`
- Create: `src/activities/CalendarPage.test.jsx`
- Modify: `src/activities/ActivityCard.jsx`
- Modify: `src/activities/ActivityCard.test.jsx`
- Modify: `src/activities/FollowUpCenter.jsx`
- Modify: `src/activities/ActivityDetailPage.jsx`
- Modify: `src/styles/screens.css`

**Interfaces:**

- Activity Form branch/status use `CustomSelect`; customer uses required `SearchableSelect`.
- Activities filters: scope/status use `CustomSelect`, staff uses `SearchableSelect`, date uses `DateField type="date"`.
- Calendar filters: type/scope/status use `CustomSelect`, staff uses `SearchableSelect`.
- Activity start/end/follow-up/reschedule values still pass through existing `toInputDateTime` and `fromLaosDateTimeInput` functions.
- `subscribeActivities` and `subscribeAssignableUsers` calls and filter predicates remain unchanged.

- [ ] **Step 1: Add failing Activity Form control/validation tests**

Test required-customer behavior without relying on native `<select required>`:

```jsx
await user.click(screen.getByRole('button', { name: 'ບັນທຶກກິດຈະກຳ' }));
expect(onSubmit).not.toHaveBeenCalled();
expect(screen.getByRole('alert')).toHaveTextContent('ນັດພົບລູກຄ້າຕ້ອງເລືອກລູກຄ້າ');
expect(screen.getByRole('combobox', { name: /ລູກຄ້າ/ })).toHaveFocus();
```

After selecting customer `c1`, fill exact valid values and verify the transformed payload:

```jsx
fireEvent.change(screen.getByLabelText('ຫົວຂໍ້'), { target: { value: 'ນັດພົບຮ້ານ ກ' } });
fireEvent.change(screen.getByLabelText('ເລີ່ມ'), { target: { value: '2026-08-26T09:00' } });
fireEvent.change(screen.getByLabelText('ສິ້ນສຸດ'), { target: { value: '2026-08-26T10:00' } });
await user.click(screen.getByRole('combobox', { name: /ລູກຄ້າ/ }));
await user.click(screen.getByRole('option', { name: /Customer · 020/ }));
await user.click(screen.getByRole('button', { name: 'ບັນທຶກກິດຈະກຳ' }));
expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
  customerId: 'c1',
  startAt: '2026-08-26T02:00:00.000Z',
  endAt: '2026-08-26T03:00:00.000Z',
}));
```

- [ ] **Step 2: Add failing Activities filter tests**

Mock branch activities/users and assert scope/status/staff/date filters retain exact behavior:

```jsx
await user.click(screen.getByRole('combobox', { name: 'ສະຖານະກິດຈະກຳ' }));
await user.click(screen.getByRole('option', { name: 'ກຳລັງດຳເນີນ' }));
expect(screen.getByText('Meeting A')).toBeInTheDocument();
expect(screen.queryByText('Meeting B')).not.toBeInTheDocument();
```

Verify staff search does not trigger a new Firestore subscription and date filter uses Laos day keys.

- [ ] **Step 3: Add failing Calendar filter/grouping tests**

Assert type/scope/staff/status options, `Asia/Vientiane` day heading, chronological items, add route `/activities/new/appointment?date=YYYY-MM-DD`, Lao status/type labels and empty state. Use custom-select interactions, not `selectOptions`.

- [ ] **Step 4: Run focused tests and verify RED**

```powershell
npm.cmd test -- src/activities/ActivityForm.test.jsx src/activities/ActivitiesPage.test.jsx src/activities/CalendarPage.test.jsx src/activities/ActivityCard.test.jsx
```

Expected: tests FAIL while native selects/date inputs and old surfaces remain.

- [ ] **Step 5: Migrate Activity Form controls**

Build option arrays from existing constants/users/customers. Customer option label is `${customer.name} · ${customer.phone}` with `searchText` containing both. Add local `customerError`; on invalid Customer Meeting submit, prevent submission, set the exact Lao error, and focus the SearchableSelect trigger through an exposed `ref` using `forwardRef`.

Keep `assignedStaffIds` checkbox behavior, Admin branch filtering, product/service transform and ISO conversion unchanged.

- [ ] **Step 6: Migrate Activities and Calendar filters**

Replace all ten native select surfaces with shared controls and replace the Activities date filter with `DateField`. Do not change `useMemo` predicates, `scope === 'branch'` behavior, staff membership checks, sorting or `laosDayKey` grouping.

- [ ] **Step 7: Apply GlassCard/StatusBadge and responsive calendar surfaces**

Use `StatusBadge` in Activity Card, Activity Detail, Customer history and calendar items. Use `GlassCard` for filter panels, follow-up summaries and calendar agenda groups. Preserve links/routes and click targets.

- [ ] **Step 8: Verify activity/calendar behavior**

```powershell
npm.cmd test -- src/activities/ActivityForm.test.jsx src/activities/ActivitiesPage.test.jsx src/activities/CalendarPage.test.jsx src/activities/ActivityCard.test.jsx src/activities/activityModel.test.js src/shared/dateTime.test.js src/shared/followUp.test.js
npm.cmd test -- src/services/queryScope.test.js src/shared/permissions.test.js
npm.cmd run lint
```

Expected: all focused UI/domain/scope tests PASS.

- [ ] **Step 9: Commit checkpoint**

```powershell
git add src/activities/ActivityForm.jsx src/activities/ActivityForm.test.jsx src/activities/ActivitiesPage.jsx src/activities/ActivitiesPage.test.jsx src/activities/CalendarPage.jsx src/activities/CalendarPage.test.jsx src/activities/ActivityCard.jsx src/activities/ActivityCard.test.jsx src/activities/FollowUpCenter.jsx src/activities/ActivityDetailPage.jsx src/styles/screens.css
git commit -m "feat: modernize activity filters forms and calendar"
```

---

### Task 7: Solid Call/WhatsApp actions and linked customer details

**Files:**

- Create: `src/components/icons/WhatsAppIcon.jsx`
- Create: `src/components/ContactActions.jsx`
- Create: `src/components/ContactActions.test.jsx`
- Modify: `src/components/CustomerCard.jsx`
- Modify: `src/components/CustomerCard.test.jsx`
- Modify: `src/customers/CustomerDetailPage.jsx`
- Modify: `src/customers/CustomerDetailPage.test.jsx`
- Modify: `src/activities/ActivityDetailPage.jsx`
- Create: `src/activities/ActivityDetailPage.test.jsx`
- Modify: `src/styles/components.css`
- Modify: `src/styles/screens.css`

**Interfaces:**

- Produces `WhatsAppIcon({ className })`, an `aria-hidden` solid inline SVG.
- Produces `ContactActions({ customer, size, showLabels, className })`.
- `ContactActions` consumes unchanged `customerQuickActions(customer)` and omits unavailable links.
- `ActivityDetailPage` reads linked customer through existing `getCustomer(activity.customerId)` only; activity rendering remains usable if the customer read fails.

- [ ] **Step 1: Write failing contact action tests**

```jsx
render(<ContactActions customer={{ phone: '020 5555 1234', gps: 'https://maps.example/test' }} />);
expect(screen.getByRole('link', { name: 'ໂທຫາລູກຄ້າ' })).toHaveAttribute('href', 'tel:02055551234');
expect(screen.getByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' })).toHaveAttribute('href', 'https://wa.me/8562055551234');
expect(screen.getByTestId('whatsapp-solid-icon')).toHaveAttribute('aria-hidden', 'true');
expect(screen.getByRole('link', { name: 'ໂທຫາລູກຄ້າ' })).toHaveClass('contact-action--call');
expect(screen.getByRole('link', { name: 'ຕິດຕໍ່ຜ່ານ WhatsApp' })).toHaveClass('contact-action--whatsapp');
```

Also assert missing phone/GPS omits corresponding actions and `showLabels` renders Lao visible labels.

- [ ] **Step 2: Add failing Activity linked-customer test**

Mock an activity with `customerId: 'c1'`, mock `getCustomer('c1')`, render Activity Detail and assert the customer name plus Call/WhatsApp links appear. In a separate test reject `getCustomer`; assert activity title/status/detail and “ເບິ່ງລູກຄ້າ” link still render.

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
npm.cmd test -- src/components/ContactActions.test.jsx src/components/CustomerCard.test.jsx src/customers/CustomerDetailPage.test.jsx src/activities/ActivityDetailPage.test.jsx src/shared/quickActions.test.js
```

Expected: contact component and linked-customer assertions FAIL.

- [ ] **Step 4: Implement and adopt shared contact actions**

Keep link generation delegated:

```jsx
const actions = customerQuickActions(customer);
return <div className={`contact-actions contact-actions--${size} ${className}`}>
  {actions.call && <IconButton href={actions.call} label="ໂທຫາລູກຄ້າ" tone="gray"><span className="material-symbols-outlined filled" aria-hidden="true">call</span>{showLabels && <span>ໂທ</span>}</IconButton>}
  {actions.whatsapp && <IconButton href={actions.whatsapp} label="ຕິດຕໍ່ຜ່ານ WhatsApp" tone="teal" target="_blank" rel="noreferrer"><WhatsAppIcon />{showLabels && <span>WhatsApp</span>}</IconButton>}
  {actions.map && <IconButton href={actions.map} label="ເປີດແຜນທີ່ລູກຄ້າ" tone="gray" target="_blank" rel="noreferrer"><span className="material-symbols-outlined filled" aria-hidden="true">location_on</span>{showLabels && <span>ແຜນທີ່</span>}</IconButton>}
</div>;
```

Use compact actions on Customer Card and labelled large actions on Customer Detail/Activity linked customer. Call is gray; WhatsApp is teal; destructive actions remain orange.

- [ ] **Step 5: Verify and commit**

```powershell
npm.cmd test -- src/components/ContactActions.test.jsx src/components/CustomerCard.test.jsx src/customers/CustomerDetailPage.test.jsx src/activities/ActivityDetailPage.test.jsx src/shared/quickActions.test.js
npm.cmd run lint
git add src/components/icons/WhatsAppIcon.jsx src/components/ContactActions.jsx src/components/ContactActions.test.jsx src/components/CustomerCard.jsx src/components/CustomerCard.test.jsx src/customers/CustomerDetailPage.jsx src/customers/CustomerDetailPage.test.jsx src/activities/ActivityDetailPage.jsx src/activities/ActivityDetailPage.test.jsx src/styles/components.css src/styles/screens.css
git commit -m "feat: unify solid customer contact actions"
```

Expected: exact links, accessible names, colors/classes and fallback tests PASS.

---

### Task 8: Modal Quick Create, navigation and global surface refresh

**Files:**

- Modify: `src/components/QuickCreate.jsx`
- Modify: `src/components/QuickCreate.test.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/components/BottomNav.jsx`
- Modify: `src/components/BottomNav.test.jsx`
- Modify: `src/components/AppShell.jsx`
- Modify: `src/pages/Home.jsx`
- Create: `src/pages/Home.test.jsx`
- Modify: `src/auth/PendingPage.jsx`
- Modify: `src/auth/DisabledPage.jsx`
- Modify: `src/styles/components.css`
- Modify: `src/styles/screens.css`
- Modify: `src/index.css`

**Interfaces:**

- Quick Create composes `ModalSheet`; four routes remain `/customers/new`, `/activities/new/appointment`, `/activities/new/event`, `/activities/new/customer_visit`.
- Bottom Nav keeps exactly five destinations.
- Navbar logout/back behavior remains unchanged.
- Home subscriptions/count logic remains unchanged.

- [ ] **Step 1: Add failing Quick Create dialog keyboard/focus tests**

Extend current tests:

```jsx
const launcher = screen.getByRole('button', { name: 'ສ້າງລາຍການໃໝ່' });
await user.click(launcher);
expect(screen.getByRole('dialog', { name: 'ສ້າງໃໝ່' })).toBeInTheDocument();
await user.keyboard('{Escape}');
expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
expect(launcher).toHaveFocus();
```

Keep the four route assertions, including the internal `/customer_visit` route.

- [ ] **Step 2: Add failing Home copy/status test**

Mock subscriptions to emit one `customer_visit` with `in_progress`, render Home and assert:

```jsx
expect(screen.getByText('ນັດພົບລູກຄ້າມື້ນີ້')).toBeInTheDocument();
expect(screen.getByText('ກຳລັງດຳເນີນ')).toBeInTheDocument();
expect(screen.queryByText(/ການຢ້ຽມລູກຄ້າ/)).not.toBeInTheDocument();
```

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
npm.cmd test -- src/components/QuickCreate.test.jsx src/components/BottomNav.test.jsx src/pages/Home.test.jsx
```

Expected: ModalSheet/focus and new Home surface assertions FAIL.

- [ ] **Step 4: Compose shared modal/cards/buttons**

Replace Quick Create’s hand-rolled backdrop/sheet with `ModalSheet`. Use `IconButton` for launcher/back, `Button` for close/logout/status actions, `GlassCard` for dashboard/auth state surfaces and `StatusBadge` through ActivityCard. Do not change route declarations or Auth hooks.

- [ ] **Step 5: Apply shell and global visual rules**

Move shell/nav/dashboard/auth/status layout rules into `screens.css`; keep `index.css` as Tailwind/reset/compatibility. Use opaque backgrounds first, blur ≤10px for sticky navigation and 4px backdrop. Replace blue/purple/red/yellow presentation colors with Teal/Gray/Black/Orange semantics.

- [ ] **Step 6: Verify navigation/auth/dashboard regressions**

```powershell
npm.cmd test -- src/components/QuickCreate.test.jsx src/components/BottomNav.test.jsx src/pages/Home.test.jsx src/auth/authModel.test.js src/auth/routePolicy.test.js
npm.cmd run lint
```

Expected: navigation, Auth state and dashboard tests PASS.

- [ ] **Step 7: Commit checkpoint**

```powershell
git add src/components/QuickCreate.jsx src/components/QuickCreate.test.jsx src/components/Navbar.jsx src/components/BottomNav.jsx src/components/BottomNav.test.jsx src/components/AppShell.jsx src/pages/Home.jsx src/pages/Home.test.jsx src/auth/PendingPage.jsx src/auth/DisabledPage.jsx src/styles/components.css src/styles/screens.css src/index.css
git commit -m "feat: refresh CRM shell modal and dashboard surfaces"
```

---

### Task 9: Source guard, responsive/accessibility polish and manual viewport evidence

**Files:**

- Create: `src/test/uiSourceGuard.test.js`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/components.css`
- Modify: `src/styles/screens.css`

**Interfaces:**

- Source guard returns zero production JSX files containing visible native `<select>` markup.
- Source guard returns zero production UI files containing legacy Customer Visit phrases.
- CSS guarantees 44px targets, 320px no-overflow structure, reduced motion and safe-area handling.

- [ ] **Step 1: Add a failing production-source guard**

Use Node filesystem APIs from Vitest and exclude test files:

```js
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function productionSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSourceFiles(path);
    const productionModule = /\.(js|jsx)$/.test(entry.name) && !/\.test\.(js|jsx)$/.test(entry.name);
    return productionModule ? [path] : [];
  });
}

it('contains no visible native select markup in production JSX', () => {
  const offenders = productionSourceFiles('src')
    .filter((path) => path.endsWith('.jsx'))
    .filter((path) => /<select\b/.test(readFileSync(path, 'utf8')));
  expect(offenders).toEqual([]);
});
```

Build legacy phrases from fragments in the test so the guard does not match itself, then scan production `.js`/`.jsx` while excluding tests:

```js
const legacyPhrases = [
  ['ການຢ້ຽມຢາມ', 'ລູກຄ້າ'].join(''),
  ['ການຢ້ຽມ', 'ລູກຄ້າ'].join(''),
  ['ຢ້ຽມ', 'ລູກຄ້າ'].join(''),
];

it('contains no legacy Customer Visit display phrase', () => {
  const offenders = productionSourceFiles('src').filter((path) => {
    const source = readFileSync(path, 'utf8');
    return legacyPhrases.some((phrase) => source.includes(phrase));
  });
  expect(offenders).toEqual([]);
});

it('preserves internal activity keys', () => {
  const constants = readFileSync('src/shared/constants.js', 'utf8');
  expect(constants).toContain("CUSTOMER_VISIT: 'customer_visit'");
  expect(constants).toContain("'in_progress'");
});
```

- [ ] **Step 2: Run the guard and verify RED if adoption is incomplete**

```powershell
npm.cmd test -- src/test/uiSourceGuard.test.js
```

Expected: FAIL with exact remaining file paths if any native select or legacy display phrase remains. Return to the owning Task 4, 5 or 6 and fix that exact listed file; Task 9 itself changes only the guard and CSS files above.

- [ ] **Step 3: Complete CSS responsive/accessibility rules**

Add exact breakpoints and guarantees:

```css
@media (max-width: 430px) {
  .form-grid, .admin-row, .calendar-day { grid-template-columns: minmax(0, 1fr); }
  .ui-select-popover--sheet { inset: auto 8px 0; width: auto; max-height: calc(100dvh - 16px); padding-bottom: env(safe-area-inset-bottom); }
}
@media (max-width: 390px) {
  .page-content, .app-header { padding-inline: 12px; }
  .contact-actions { flex-wrap: wrap; }
}
@media (max-width: 360px) {
  .bottom-nav-item { min-width: 0; font-size: 10px; }
  .detail-list p { grid-template-columns: minmax(76px, .7fr) minmax(0, 1.3fr); }
  .customer-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 320px) {
  .page-content, .app-header { padding-inline: 10px; }
  .glass-card, .ui-modal-sheet { max-width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 1ms !important; animation-duration: 1ms !important; }
}
```

Ensure `.ui-button`, `.ui-icon-button`, `.ui-select-trigger`, `.ui-date-action`, `.bottom-nav-item`, `.quick-create`, `.calendar-add` have `min-width`/`min-height: var(--touch-target)` where applicable. Add `min-width: 0`, `overflow-wrap: anywhere`, `max-width: 100%` to nested grid/flex content.

- [ ] **Step 4: Start local preview for manual evidence**

Run in one terminal:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Use a seeded/local approved account and inspect these routes at 320, 360, 390 and 430px: `/`, `/customers`, `/customers/:id`, `/customers/new`, `/activities`, `/activities/new/customer_visit`, `/activities/:id`, `/calendar`, `/profile`, `/admin`.

The Vite app uses the Firebase configuration in `src/firebase/config.js`; unless the implementation session explicitly connects it to emulators, keep this viewport pass read-only and do not submit forms, change status, transfer records or invoke Admin actions.

At each route/width, evaluate:

```js
({
  width: window.innerWidth,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
})
```

Expected: `overflow <= 0`.

- [ ] **Step 5: Run manual interaction matrix**

For Custom Select and Searchable Select on Activity Form, Calendar, Customer Card and Admin:

- mouse click open/select/outside-close;
- keyboard Enter/Space/Arrow/Home/End/Escape/Tab;
- touch tap open/select/scroll/close;
- focus remains visible and returns to trigger;
- popup/sheet stays inside viewport and is not clipped;
- calendar native picker opens and calendar agenda stacks at 320px;
- Quick Create modal traps/restores focus and scrolls within `100dvh`;
- Call and WhatsApp open exact `tel:`/`wa.me` targets;
- no control is smaller than 44×44px.

- [ ] **Step 6: Run automated accessibility/source regressions**

```powershell
npm.cmd test -- src/test/uiSourceGuard.test.js src/components/ui/CustomSelect.test.jsx src/components/ui/SearchableSelect.test.jsx src/components/ui/ModalSheet.test.jsx src/components/ui/DateField.test.jsx src/components/ContactActions.test.jsx
npm.cmd run lint
git diff --check
```

Expected: all tests PASS, lint exits 0, `git diff --check` prints nothing.

- [ ] **Step 7: Commit checkpoint**

```powershell
git add src/test/uiSourceGuard.test.js src/styles/tokens.css src/styles/components.css src/styles/screens.css src
git commit -m "test: lock responsive accessible CRM UI behavior"
```

Before committing, inspect `git status --short` and ensure the broad `git add src` contains only files in this plan.

---

### Task 10: Full regression gates, scope lock and Hosting-only release preparation

**Files:**

- No source file is created by this task.
- Update the implementation record/commit only if a verification failure requires an in-scope fix; rerun the affected task’s focused tests before returning here.

**Interfaces:**

- Release candidate is accepted only if frontend, Functions, Rules, lint, build, diff and manual gates all pass.
- Scope lock proves no backend/schema/security/Auth/query/permission file changed from `10ad1d4`.
- Production remains untouched; Hosting commands below require a later explicit release approval.

- [ ] **Step 1: Run the complete frontend suite**

```powershell
npm.cmd test
```

Expected: every Vitest frontend/domain/component test PASS; zero failed or skipped regression gates.

- [ ] **Step 2: Run backend and Rules suites**

```powershell
npm.cmd run test:functions
npm.cmd run test:rules
```

Expected: Functions Node tests PASS; Firestore/Storage emulator Rules matrix PASS. Do not weaken Rules or tests to make this pass.

- [ ] **Step 3: Run lint, production build and diff checks**

```powershell
npm.cmd run lint
npm.cmd run build
git diff --check
git status --short
```

Expected: lint/build exit 0; `git diff --check` prints nothing; status contains only intended implementation files. Record the Vite output size and compare with the baseline main chunk `830.74 kB` minified / `251.35 kB` gzip; investigate a material unexplained increase before release.

- [ ] **Step 4: Prove the protected scope is unchanged**

```powershell
git diff --exit-code 10ad1d4 -- functions firestore.rules storage.rules firestore.indexes.json firebase.json src/context src/auth/authModel.js src/auth/routePolicy.js src/auth/ProtectedRoute.jsx src/services/queryScope.js src/shared/permissions.js src/services/activitiesService.js src/services/customersService.js src/services/adminService.js
```

Expected: exit 0 and no diff. If any listed file changed, stop Hosting-only preparation and return it to baseline unless a separate design/security review explicitly expands scope.

- [ ] **Step 5: Repeat role/branch acceptance**

Run:

```powershell
npm.cmd test -- src/services/queryScope.test.js src/shared/permissions.test.js src/auth/routePolicy.test.js src/admin/AdminPage.test.jsx
npm.cmd run test:functions
npm.cmd run test:rules
```

Manually verify approved Staff/Manager see only own branch, Admin sees all branches, Pending/Disabled remain isolated, direct cross-branch URLs fail, Admin role/branch updates still call the same trusted operations and Activity edit/trash buttons follow existing permission helpers.

- [ ] **Step 6: Record the release candidate and rollback source**

```powershell
git rev-parse HEAD
git log -1 --oneline
git diff --stat 10ad1d4..HEAD
```

Record the exact candidate commit and retain the existing live Hosting version before any later deploy. The implementation session stops here and asks the user for release approval.

- [ ] **Step 7: Later approved preview release only**

After a separate user approval, create a Hosting preview channel; this command is not run during implementation:

```powershell
firebase.cmd hosting:channel:deploy crm-ui-v2-20260826 --project crm-web-app-97b91
```

Run the 320px/select/calendar/contact/terminology/role-branch smoke matrix on the preview URL. A preview failure blocks live release.

Firebase preview channels for this project use the project’s real backend resources. Keep preview smoke checks read-only unless a separately approved test record/account is available; do not use preview as authorization to mutate production data.

- [ ] **Step 8: Later approved live rollback point and Hosting-only release**

After preview acceptance and a second explicit live approval, capture the current live site to a rollback channel, then promote the exact previewed Hosting version to live:

```powershell
firebase.cmd hosting:clone crm-web-app-97b91:live crm-web-app-97b91:crm-ui-v2-rollback --project crm-web-app-97b91
firebase.cmd hosting:clone crm-web-app-97b91:crm-ui-v2-20260826 crm-web-app-97b91:live --project crm-web-app-97b91
```

Do not deploy Functions, Rules, indexes, Storage or data migration. If critical UI, authorization visibility or contact/calendar behavior fails, restore the saved Hosting version:

```powershell
firebase.cmd hosting:clone crm-web-app-97b91:crm-ui-v2-rollback crm-web-app-97b91:live --project crm-web-app-97b91
```

Firebase Hosting Release History is the secondary rollback path. Production release and rollback always require named approval/operator evidence outside this implementation plan.

Official command references: [Firebase preview/live workflow](https://firebase.google.com/docs/hosting/test-preview-deploy) and [Firebase channel/version cloning](https://firebase.google.com/docs/hosting/manage-hosting-resources).

---

## Coverage map

| Approved requirement | Implemented/tested in |
|---|---|
| Clean White + Soft Glassy, palette/motion/blur | Tasks 1, 8, 9 |
| Shared cards/buttons/inputs/textareas/badges/icon buttons | Tasks 1, 5, 6, 8 |
| Custom Select/Searchable Select, mouse/keyboard/touch | Tasks 2, 5, 6, 9 |
| Calendar/date theme and mobile behavior | Tasks 3, 6, 9 |
| Customer Meeting wording/internal key | Task 4, Task 9 source guard |
| In-progress display | Tasks 1, 4, 6, 8 |
| Single purpose/no legacy write/no data deletion | Task 4 |
| WhatsApp teal solid/Call gray solid | Task 7 |
| Customer Card/Detail/Activity-linked contact actions | Task 7 |
| 320/360/390/430px, ≥44px, focus/reduced motion | Task 9 |
| Auth/branch/query/Rules/permissions unchanged | Tasks 5, 6, 10 |
| Frontend/backend/Rules/lint/build/diff gates | Task 10 |
| Hosting-only controlled release/rollback | Task 10, later approval only |
