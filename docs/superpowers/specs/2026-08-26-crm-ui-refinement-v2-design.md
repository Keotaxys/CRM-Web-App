# CRM UI Refinement v2 Design

**ສະຖານະ:** ຂອບເຂດ design 8 Sections ໄດ້ຮັບອະນຸມັດແລ້ວ; ເອກະສານນີ້ລັອກລາຍລະອຽດສຳລັບ implementation ແລະຍັງບໍ່ອະນຸຍາດໃຫ້ deploy.

**Repo baseline:** linked worktree `crm-ux-refinement`, branch `codex/crm-ux-refinement`, HEAD `10ad1d469f90f3edcf18b42aa7f268d19b62e742` (`feat: complete CRM UX refinement and account reactivation`), worktree ສະອາດໃນຕອນກວດ 2026-08-26.

**Tech baseline:** React 19.2, React Router 7.18, Vite 8, Firebase Web SDK 12.18, Tailwind 3.4, Vitest 4.1, React Testing Library 16.3, Material Symbols ແລະ `lucide-react` ທີ່ມີຢູ່ແລ້ວ.

**Inspection evidence:** `npm.cmd test` ຜ່ານ 119/119 tests, `npm.cmd run test:functions` ຜ່ານ 21/21, `npm.cmd run test:rules` ຜ່ານ 14/14, `npm.cmd run lint` ແລະ `npm.cmd run build` ອອກ code 0. Baseline build ມີ Vite main-chunk warning ທີ່ `830.74 kB` minified / `251.35 kB` gzip; ບໍ່ແມ່ນ failure ແຕ່ implementation ຕ້ອງບໍ່ເພີ່ມ heavy dependency ຫຼືຂະຫຍາຍ bundle ໂດຍບໍ່ມີເຫດຜົນ.

## 1. ເປົ້າໝາຍ

ປັບຮູບລັກ ແລະ interaction ຂອງ CRM ໃຫ້ເປັນ Clean White + Soft Glassy, ສອດຄ່ອງກັນທົ່ວ app, ໃຊ້ງານໄດ້ດີຕັ້ງແຕ່ 320px, ຮອງຮັບ keyboard/mouse/touch, ແລະຮັກສາ behavior ດ້ານ Auth, role, branch, query scope, permissions ແລະ Firestore ໄວ້ຄືເກົ່າ.

ຜົນສຳເລັດຕ້ອງເຫັນໄດ້ຊັດໃນ:

- design tokens ແລະ shared components ທີ່ໃຊ້ຊ້ຳໄດ້;
- terminology ລາວທີ່ກົງກັນທຸກໜ້າ;
- native `<select>` ທີ່ຜູ້ໃຊ້ເຫັນຖືກແທນດ້ວຍ Custom Select/Searchable Select;
- Customer Meeting form ມີ purpose ທີ່ຜູ້ໃຊ້ແກ້ໄດ້ພຽງ field ດຽວ;
- Call/WhatsApp ເປັນ solid icon actions ທີ່ສອດຄ່ອງ;
- cards, forms, filters, navigation, calendar, modal/bottom sheet, status ແລະ admin surfaces ຢູ່ໃນ visual system ດຽວກັນ.

## 2. Safety boundary ແລະ non-goals

ຫ້າມປ່ຽນ:

- Auth lifecycle, Auth routes, claims/profile agreement ຫຼື registration behavior;
- branch visibility, `customerQueryScope`, `activityQueryScope`, Firestore query constraints ຫຼື direct-document authorization;
- Firestore Rules, Storage Rules, indexes, Firebase Functions, callable authorization ຫຼື activity permissions;
- Firestore schema, customer/activity IDs, internal enums ຫຼື internal key `customer_visit`;
- customer status values, role values, branch codes ຫຼື record-state lifecycle;
- deployment configuration, production data, production Auth, production Rules ຫຼື production Hosting ໃນ implementation phase ຈົນກວ່າຈະຜ່ານ review/approval ແຍກຕ່າງຫາກ.

ວຽກນີ້ບໍ່ເພີ່ມ component library, calendar library, popover library ຫຼື icon dependency ໃໝ່. ຈະໃຊ້ React DOM, CSS, Material Symbols ແລະ dependency ທີ່ມີຢູ່. `src/App.css` ເປັນ starter CSS ທີ່ບໍ່ຖືກ import ແລະບໍ່ຢູ່ໃນ scope.

## 3. ທາງເລືອກທາງສະຖາປັດຕະຍະກຳ

ທາງເລືອກທີ່ລັອກແມ່ນ **lightweight in-repo design system**: CSS custom properties ເປັນ tokens, React components ຂະໜາດນ້ອຍທີ່ມີ controlled interfaces, ແລະ native date/datetime input ທີ່ຄຸ້ມ theme ຢູ່ຊັ້ນ surface. ນີ້ຮັກສາ bundle ແລະ risk ໃຫ້ຕ່ຳ, ບໍ່ປ່ຽນ app architecture, ແລະເໝາະກັບ repo ທີ່ມີ UI ຂະໜາດກະທັດຮັດ.

ບໍ່ເລືອກ:

- component framework ຂະໜາດໃຫຍ່ ເພາະເພີ່ມ dependency, bundle ແລະ migration surface ເກີນຈຳເປັນ;
- custom calendar engine ທີ່ສ້າງ date arithmetic ແລະ grid navigation ເອງ ເພາະສ່ຽງຕໍ່ locale/time-zone/accessibility. DateField ຈະຮັກສາ native picker ຂອງ platform ສຳລັບ touch ແລະ keyboard, ແຕ່ປັບ input surface, icon, focus, spacing ແລະ calendar agenda ໃຫ້ກົງ theme.

## 4. Design system foundation

### 4.1 Tokens

ສ້າງ `src/styles/tokens.css` ແລະກຳນົດ tokens ກາງຕໍ່ໄປນີ້:

| ກຸ່ມ | Tokens ແລະຄ່າທີ່ລັອກ |
|---|---|
| White/surfaces | `--color-white: #ffffff`, `--surface-page: #f7faf9`, `--surface-glass: rgb(255 255 255 / 0.82)`, `--surface-muted: #f1f5f4` |
| Teal | `--teal-700: #0f766e`, `--teal-600: #0d9488`, `--teal-500: #14b8a6`, `--teal-100: #ccfbf1`, `--teal-50: #f0fdfa` |
| Gray/black | `--ink-950: #0a0f0e`, `--ink-800: #1f2937`, `--gray-600: #5f6b69`, `--gray-400: #94a3a0`, `--gray-200: #dde5e3`, `--gray-100: #edf2f1` |
| Orange | `--orange-700: #c2410c`, `--orange-600: #ea580c`, `--orange-100: #ffedd5`, `--orange-50: #fff7ed`; ໃຊ້ສຳລັບ warning, destructive, cancelled ແລະ error ເທົ່ານັ້ນ |
| Radius | `--radius-sm: 10px`, `--radius-md: 14px`, `--radius-lg: 20px`, `--radius-xl: 26px`, `--radius-pill: 999px` |
| Shadow | `--shadow-sm`, `--shadow-card`, `--shadow-float` ເປັນ neutral/teal alpha ທີ່ອ່ອນ; ບໍ່ມີ heavy black shadow |
| Focus | `--focus-ring: 0 0 0 3px rgb(20 184 166 / 0.24)` ແລະ outline ທີ່ບໍ່ຖືກປິດ |
| Motion | `--motion-fast: 150ms`, `--motion-base: 180ms`, `--motion-slow: 220ms`, easing `cubic-bezier(.2,.8,.2,1)` |
| Blur | glass cards 8px, sticky navigation 10px, modal backdrop 4px; ບໍ່ເກີນ 12px |
| Touch | `--touch-target: 44px`; buttons, icon buttons, nav items, select trigger ແລະ date picker action ຕ້ອງບໍ່ນ້ອຍກວ່ານີ້ |

ສີ blue, purple, red ແລະ yellow ທີ່ປັດຈຸບັນໃຊ້ໃນ status cards ຈະຖືກ map ເຂົ້າ Teal/Gray/Black; orange ໃຊ້ສະເພາະ warning/destructive/error. `prefers-reduced-motion: reduce` ຈະປິດ transform ແລະຫຼຸດ duration ເປັນ 1ms.

### 4.2 CSS structure

- `src/index.css`: Tailwind directives, reset ພື້ນຖານ ແລະ compatibility classes ທີ່ຍັງຈຳເປັນ.
- `src/styles/tokens.css`: ສີ, type, spacing, radius, shadow, z-index, focus, motion ແລະ reduced-motion.
- `src/styles/components.css`: shared controls, buttons, cards, selects, date fields, badges, icon/contact actions, modal/sheet.
- `src/styles/screens.css`: shell/navigation, dashboard, customer/activity/calendar/admin layouts ແລະ responsive rules.
- `src/main.jsx`: import CSS ຕາມລຳດັບ `index.css` → `tokens.css` → `components.css` → `screens.css`.

`backdrop-filter` ຈະມີ opaque fallback ກ່ອນ ແລະມີ `@supports` ສຳລັບ glass effect. ເນື້ອຫາສຳຄັນບໍ່ພຶ່ງ blur ໃນການເບິ່ງເຫັນ.

## 5. Shared component contracts

### 5.1 `Button`

`src/components/ui/Button.jsx`

```jsx
<Button variant="primary|secondary|neutral|warning|danger" size="sm|md" busy={false}>
  {children}
</Button>
```

`primary` ເປັນ teal solid, `secondary` ເປັນ teal tint, `neutral` ເປັນ white/gray, `warning` ແລະ `danger` ໃຊ້ orange. Component forward ຄ່າ button attributes, ຕັ້ງ `type="button"` ເປັນ default ແລະ consumer ຕ້ອງລະບຸ `type="submit"` ເມື່ອສົ່ງ form.

### 5.2 `IconButton`

`src/components/ui/IconButton.jsx`

```jsx
<IconButton label="ຕິດຕໍ່ຜ່ານ WhatsApp" tone="teal" size="md" href={actions.whatsapp}>
  {icon}
</IconButton>
```

ຖ້າມີ `href` ຈະ render `<a>`, ຖ້າບໍ່ມີຈະ render `<button type="button">`; `label` ແມ່ນ accessible name ບັງຄັບ ແລະ target ຂັ້ນຕ່ຳ 44×44px.

### 5.3 `Input`, `Textarea`, `DateField`

```jsx
<Input id="customer-name" label="ຊື່ລູກຄ້າ" value={values.name} onChange={onNameChange} error={errors.name} />
<Textarea id="customer-note" label="ໝາຍເຫດ" rows={3} value={values.note} onChange={onNoteChange} />
<DateField id="activity-start" type="datetime-local" label="ເລີ່ມ" value={values.startAt} onChange={onStartChange} />
```

ທັງສາມ component ສ້າງ label/description/error relationships ດ້ວຍ `htmlFor`, `aria-describedby`, `aria-invalid`. `DateField` ຮັກສາ native date/datetime input, ມີ themed calendar icon, ເອີ້ນ `showPicker()` ເມື່ອ browser ຮອງຮັບ, ແລະ fallback ເປັນ focus/click ປົກກະຕິ.

### 5.4 `CustomSelect`

`src/components/ui/CustomSelect.jsx`

```jsx
<CustomSelect
  id="activity-status"
  label="ສະຖານະ"
  value={value}
  options={[{ value: 'planned', label: 'ວາງແຜນ', disabled: false }]}
  onChange={(nextValue) => setValue(nextValue)}
  placeholder="ເລືອກສະຖານະ"
  disabled={false}
  required={false}
  error={message}
/>
```

ມັນເປັນ controlled select-only combobox/listbox ແລະບໍ່ render visible native `<select>`. Trigger ມີ `aria-expanded`, `aria-controls`, `aria-haspopup="listbox"`, `aria-required`; list ມີ `role="listbox"`; option ມີ `role="option"` ແລະ `aria-selected`. `CustomSelect` ແລະ `SearchableSelect` ຮັບ forwarded `ref` ທີ່ຊີ້ໄປຫາ trigger/input ເພື່ອໃຫ້ consumer focus control ເມື່ອ validation ບໍ່ຜ່ານ.

Keyboard contract:

- Enter/Space/ArrowDown/ArrowUp ເປີດ listbox;
- ArrowDown/ArrowUp ຍ້າຍ active option, Home/End ໄປຕົ້ນ/ທ້າຍ;
- Enter/Space ເລືອກ, Escape ປິດໂດຍບໍ່ປ່ຽນ, Tab ປິດແລະໄປຕາມ focus order;
- click/tap ນອກ component ປິດ listbox;
- ຫຼັງເລືອກ ຫຼື Escape, focus ກັບ trigger.

Popup render ຜ່ານ `createPortal(document.body)` ເພື່ອບໍ່ຖືກ clip ໂດຍ Customer Card; ມັນຄຳນວນພື້ນທີ່ເທິງ/ລຸ່ມ trigger, ຈຳກັດຢູ່ viewport, ແລະປ່ຽນເປັນ bottom-sheet listbox ທີ່ width ≤430px. ການ reposition ເກີດຕອນ open, resize ແລະ scroll ເທົ່ານັ້ນ.

### 5.5 `SearchableSelect`

`src/components/ui/SearchableSelect.jsx`

```jsx
<SearchableSelect
  id="customerId"
  label="ລູກຄ້າ (ຈຳເປັນ)"
  value={values.customerId}
  options={customerOptions}
  onChange={setCustomerId}
  searchPlaceholder="ຄົ້ນຫາຊື່ ຫຼື ເບີໂທ"
  required
/>
```

Search ໃຊ້ case-insensitive text ຈາກ option label, ບໍ່ປ່ຽນ stored value, ແລະສະແດງ Lao empty state. Input ມີ `role="combobox"`, `aria-autocomplete="list"` ແລະໃຊ້ keyboard contract ດຽວກັບ CustomSelect. ຈະໃຊ້ກັບ Customer ໃນ Activity Form ແລະ Staff filters ທີ່ option list ສາມາດຍາວ; ບໍ່ filter Firestore ແລະບໍ່ປ່ຽນ subscription/query scope.

### 5.6 `GlassCard`, `StatusBadge`, `ModalSheet`

```jsx
<GlassCard as="section" variant="raised" className="customer-profile" />
<StatusBadge kind="activity|customer|account|priority" value={storedValue} label={displayLabel} />
<ModalSheet open={open} onClose={close} title="ສ້າງໃໝ່" mobileSheet initialFocusRef={firstChoiceRef} />
```

`GlassCard` ບໍ່ປ່ຽນ semantics ຂອງ element. `StatusBadge` ຮັບ stored value ແຕ່ສະແດງ label ທີ່ມາຈາກ constants. `ModalSheet` ສ້າງ portal, `role="dialog"`, `aria-modal="true"`, labelled title, Escape/backdrop close, focus trap, initial focus, focus restore ແລະ body scroll lock. Desktop ເປັນ centered modal; width ≤430px ເປັນ bottom sheet. Quick Create ແມ່ນ consumer ທຳອິດ.

## 6. Terminology ແລະ data compatibility

### 6.1 Canonical display text

| ບ່ອນ | Text ທີ່ຕ້ອງສະແດງ |
|---|---|
| `activityTypeLabel('customer_visit')` | `ນັດພົບລູກຄ້າ` |
| Quick Create | `ນັດພົບລູກຄ້າ` |
| Customer Detail action | `ສ້າງນັດພົບລູກຄ້າ` |
| Dashboard summary | `ນັດພົບລູກຄ້າມື້ນີ້` |
| Customer history heading | `ກິດຈະກຳ & ປະຫວັດນັດພົບ` |
| Required-customer error | `ນັດພົບລູກຄ້າຕ້ອງເລືອກລູກຄ້າ` |
| Customer Meeting purpose | `ຈຸດປະສົງການນັດພົບ` |
| Meeting notes/results | `ບັນທຶກກ່ອນນັດພົບ`, `ບັນທຶກການນັດພົບ`, `ຜົນການນັດພົບ` |
| `activityStatusLabel('in_progress')` | `ກຳລັງດຳເນີນ` |

`customer_visit` ແລະ `in_progress` ຍັງເປັນ internal/stored values ຄືເກົ່າ. UI source guard ຈະຫ້າມ raw enum ປາກົດເປັນ display text ແລະຫ້າມ legacy phrases `ການຢ້ຽມຢາມລູກຄ້າ`, `ການຢ້ຽມລູກຄ້າ`, `ຢ້ຽມລູກຄ້າ` ຢູ່ໃນ JSX/label constants.

### 6.2 Single-purpose rule

`purpose` ແມ່ນ canonical field ສຳລັບການຂຽນໃໝ່. `visitPurpose` ແມ່ນ read-only legacy compatibility field.

- ເມື່ອເປີດ record ເກົ່າ: form value = `initial.purpose ?? initial.visitPurpose ?? ''`.
- ໃນ Customer Meeting form: render input ພຽງອັນດຽວ label `ຈຸດປະສົງການນັດພົບ` ແລະ bind ກັບ `purpose`.
- ໃນ Appointment/Event: render general purpose input label `ຈຸດປະສົງ` ແລະ bind ກັບ `purpose`.
- ກ່ອນ `onSubmit`, ຕັດ `visitPurpose` ອອກຈາກ UI payload ເພື່ອບໍ່ຂຽນຄ່າໃໝ່ໃສ່ legacy field.
- `ActivityDetailPage` ອ່ານ `activity.purpose || activity.visitPurpose || '—'` ເພື່ອຮອງຮັບ record ເກົ່າ.
- `activityModel.js` ຍັງຮູ້ຈັກ `visitPurpose` ເພື່ອບໍ່ທຳລາຍ compatibility; ບໍ່ມີ migration, delete, unset ຫຼື schema/rules change.

## 7. Select/date/calendar adoption matrix

native `<select>` ທີ່ຜູ້ໃຊ້ເຫັນທັງ 17 ຈຸດຈະຖືກແທນ:

| File/surface | Component |
|---|---|
| `ActivityForm.jsx`: Admin branch, activity status | `CustomSelect` |
| `ActivityForm.jsx`: customer | `SearchableSelect` |
| `ActivitiesPage.jsx`: scope, status | `CustomSelect` |
| `ActivitiesPage.jsx`: staff | `SearchableSelect` |
| `CalendarPage.jsx`: type, scope, status | `CustomSelect` |
| `CalendarPage.jsx`: staff | `SearchableSelect` |
| `CustomerCard.jsx`: status | `CustomSelect` compact variant |
| `CustomerForm.jsx`: Admin branch, customer status, priority | `CustomSelect` |
| `CustomerDetailPage.jsx`: transfer branch | `CustomSelect` |
| `AdminPage.jsx`: role, branch | `CustomSelect` |

Date/datetime surfaces:

- `ActivitiesPage.jsx` activity date filter → `DateField type="date"`;
- `ActivityForm.jsx` start/end/follow-up → `DateField type="datetime-local"`;
- `ActivityDetailPage.jsx` reschedule date → `DateField type="datetime-local"`.

`CalendarPage.jsx` ຍັງເປັນ agenda grouped by `laosDayKey` ແລະໃຊ້ `Asia/Vientiane` ຄືເກົ່າ. ການປັບມີສະເພາະ cards, date heading, add action, filters, empty state, mobile stacking ແລະ visual status; ບໍ່ປ່ຽນ sorting, grouping ຫຼື subscription.

## 8. Contact actions ແລະ icons

ສ້າງ `src/components/ContactActions.jsx` ດ້ວຍ contract:

```jsx
<ContactActions customer={customer} size="compact|large" showLabels={false} />
```

Component ໃຊ້ `customerQuickActions(customer)` ຄືເກົ່າ, ດັ່ງນັ້ນ `tel:` ແລະ `https://wa.me/` normalization ບໍ່ປ່ຽນ. WhatsApp ໃຊ້ inline solid SVG ຈາກ `src/components/icons/WhatsAppIcon.jsx` ສີ teal; Call ໃຊ້ filled Material Symbol `call` ສີ gray; Map ໃຊ້ gray/black. Icon ທັງໝົດ `aria-hidden`, accessible name ຢູ່ action link.

Adoption:

- `CustomerCard.jsx`: compact icon-only actions;
- `CustomerDetailPage.jsx`: large actions ພ້ອມ Lao labels;
- `ActivityDetailPage.jsx`: ເມື່ອມີ `customerId`, ອ່ານ customer ຜ່ານ `getCustomer(customerId)` ແລະສະແດງ linked-customer card/contact actions; ຖ້າ read ບໍ່ສຳເລັດ ຍັງສະແດງ link ໄປ Customer Detail ໂດຍບໍ່ບັງການໂຫຼດ activity.

ການອ່ານ customer ນີ້ໃຊ້ service ທີ່ມີຢູ່ ແລະ Firestore Rules ເດີມ; ບໍ່ປ່ຽນ query scope ຫຼື permissions.

## 9. Screen-level refresh

- **Shell/navigation:** sticky header ສີ white/glass, focusable back/logout, bottom nav 5 destinations ຄືເກົ່າ, safe-area padding, Quick Create ຢູ່ເໜືອ nav ແລະບໍ່ບັງຄວບຄຸມ.
- **Dashboard:** welcome, three summary cards, follow-up cards ແລະ recent activity ໃຊ້ Glass Card/status system; `customer_visit` count logic ບໍ່ປ່ຽນ.
- **Customers:** search/filter, card grid, status select, detail, form, photos ແລະ admin transfer ໃຊ້ shared controls. Grid ເປັນ 1 column ທີ່ 320–360px ເພື່ອຮັກສາ 3 contact actions ຂະໜາດ 44px; ເປັນ 2 columns ທີ່ 361–699px, 3 columns ທີ່ 700–1023px ແລະ 4 columns ຕັ້ງແຕ່ 1024px.
- **Activities/follow-up:** cards, filters, status badges, form fields, detail actions ແລະ follow-up panel ໃຊ້ shared system; business filters ແລະ permissions ຄືເກົ່າ.
- **Calendar:** filters stack ແບບ 1 column ທີ່ mobile, agenda item ບໍ່ຕັດ status/type, add action ມີ 44px target.
- **Admin:** role/branch selects ບໍ່ overflow ທີ່ 320px; action hierarchy ແຍກ save/reactivate (teal), disable/delete (orange), restore/cleanup (secondary/warning). Account lifecycle calls ບໍ່ປ່ຽນ.
- **Auth/Profile/Pending/Disabled:** ໃຊ້ same cards, fields ແລະ buttons ໂດຍບໍ່ປ່ຽນ routing ຫຼື Auth calls.

## 10. Responsive, accessibility ແລະ performance

### 10.1 Responsive matrix

ທົດສອບຢ່າງນ້ອຍທີ່ 320, 360, 390, 430, 700 ແລະ 1024px. ທີ່ 320–430px:

- `document.documentElement.scrollWidth <= document.documentElement.clientWidth` ທຸກ route ສຳຄັນ;
- forms, filters, admin rows, detail lists ແລະ contact actions stack ໂດຍບໍ່ຕັດ label;
- modal/select sheet ຈຳກັດຄວາມສູງດ້ວຍ `100dvh`, scroll ພາຍໃນ, safe-area bottom padding;
- no fixed-width control ທີ່ກວ້າງກວ່າ viewport;
- touch targets ≥44px.

### 10.2 Accessibility

- semantic headings, landmarks, buttons, links ແລະ form labels ຕ້ອງຄົງຢູ່;
- `:focus-visible` ຊັດເຈນທຸກ interactive element;
- dialog/select keyboard contracts ຕ້ອງຜ່ານ RTL tests ແລະ manual keyboard pass;
- foreground/background contrast ຢ່າງນ້ອຍ WCAG AA ສຳລັບ body text ແລະ controls;
- color ບໍ່ແມ່ນສັນຍານດຽວ: status ມີ text, errors ມີ `role="alert"`, success ມີ `role="status"`;
- icon-only actions ມີ Lao/clear accessible names;
- motion ເຄົາລົບ `prefers-reduced-motion`.

### 10.3 Performance

- ບໍ່ເພີ່ມ runtime dependency;
- select/search filtering ເປັນ in-memory ແລະຄຳນວນສະເພາະເມື່ອ query/options ປ່ຽນ;
- event listeners ສຳລັບ popup/dialog ມີສະເພາະຕອນ open ແລະ cleanup ຕອນ close/unmount;
- backdrop blur ຈຳກັດຕາມ tokens ແລະມີ fallback;
- production build ຕ້ອງຜ່ານ. Existing main-chunk warning ຖືກບັນທຶກເປັນ baseline; ວຽກນີ້ຫ້າມເພີ່ມ heavy dependency ຫຼືເຮັດໃຫ້ warning ຮ້າຍຂຶ້ນໂດຍບໍ່ມີເຫດຜົນ.

## 11. Error handling ແລະ behavior preservation

- required Customer Meeting customer ຖືກກວດກ່ອນ submit; error ຕິດກັບ SearchableSelect ແລະ focus ກັບ control;
- async save, status update, transfer, admin ແລະ follow-up behavior ຄືເກົ່າ; shared components ບໍ່ swallow errors;
- CustomSelect/SearchableSelect ບໍ່ປ່ຽນ value ຕອນ Escape/outside close;
- disabled/busy state ປິດ interaction ແລະຮັກສາ accessible state;
- Activity linked-customer read failure ເປັນ non-blocking UI degradation;
- legacy `visitPurpose` ບໍ່ຖືກ delete ແລະບໍ່ຂຽນຄ່າໃໝ່.

## 12. File map

### Create

- `src/styles/tokens.css`
- `src/styles/components.css`
- `src/styles/screens.css`
- `src/components/ui/Button.jsx`
- `src/components/ui/IconButton.jsx`
- `src/components/ui/Input.jsx`
- `src/components/ui/Textarea.jsx`
- `src/components/ui/DateField.jsx`
- `src/components/ui/CustomSelect.jsx`
- `src/components/ui/SearchableSelect.jsx`
- `src/components/ui/GlassCard.jsx`
- `src/components/ui/StatusBadge.jsx`
- `src/components/ui/ModalSheet.jsx`
- focused `*.test.jsx` files beside those components
- `src/components/icons/WhatsAppIcon.jsx`
- `src/components/ContactActions.jsx`
- `src/components/ContactActions.test.jsx`
- `src/activities/ActivitiesPage.test.jsx`
- `src/activities/CalendarPage.test.jsx`
- `src/activities/ActivityDetailPage.test.jsx`
- `src/customers/CustomerDetailPage.test.jsx`
- `src/pages/Home.test.jsx`
- `src/test/uiSourceGuard.test.js`

### Modify

- `src/main.jsx`, `src/index.css`
- `src/shared/constants.js`, `src/shared/constants.test.js`
- `src/shared/validation.js`, `src/shared/validation.test.js`
- `src/activities/ActivityForm.jsx`, `src/activities/ActivityForm.test.jsx`, `src/activities/ActivitiesPage.jsx`, `src/activities/CalendarPage.jsx`, `src/activities/ActivityCard.jsx`, `src/activities/ActivityCard.test.jsx`, `src/activities/ActivityDetailPage.jsx`, `src/activities/FollowUpCenter.jsx`
- `src/components/AppShell.jsx`, `src/components/Navbar.jsx`, `src/components/BottomNav.jsx`, `src/components/BottomNav.test.jsx`, `src/components/QuickCreate.jsx`, `src/components/QuickCreate.test.jsx`, `src/components/CustomerCard.jsx`, `src/components/CustomerCard.test.jsx`, `src/components/CameraUpload.jsx`
- `src/customers/CustomerFilters.jsx`, `src/customers/CustomerForm.jsx`, `src/customers/CustomerForm.test.jsx`, `src/customers/CustomersPage.jsx`, `src/customers/CustomerDetailPage.jsx`
- `src/admin/AdminPage.jsx`, `src/admin/AdminPage.test.jsx`
- `src/pages/Home.jsx`, `src/pages/Login.jsx`, `src/pages/Profile.jsx`, `src/pages/Profile.test.jsx`
- `src/auth/PendingPage.jsx`, `src/auth/DisabledPage.jsx`

### Explicitly unchanged

- `src/context/**`, `src/auth/authModel.js`, `src/auth/routePolicy.js`, `src/auth/ProtectedRoute.jsx`, `src/services/queryScope.js`, `src/shared/permissions.js`
- `src/services/activitiesService.js`, `src/services/customersService.js`, `src/services/adminService.js`
- `functions/**`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`

## 13. Testing strategy

TDD ເລີ່ມຈາກ failing tests ຂອງ component contract ແລະ behavior, ຕາມດ້ວຍ minimal implementation ແລະ integration adoption. Coverage ຕ້ອງມີ:

- CustomSelect/SearchableSelect: mouse, keyboard, touch-equivalent pointer/click, focus restore, Escape, disabled, selection, search, empty state;
- ModalSheet: Escape, backdrop, focus trap/restore, accessible name;
- Input/Textarea/DateField: label, error/hint relationship, value/onChange, picker fallback;
- ContactActions: exact `tel:`/`wa.me` links, solid icon classes, accessible names;
- terminology and internal key preservation;
- single purpose field, legacy fallback, no `visitPurpose` in submitted payload;
- every select consumer, calendar filters/grouping, role/branch admin actions;
- role/branch/query/permissions regression suites ທີ່ມີຢູ່;
- frontend, Functions, Rules, lint, build, `git diff --check`;
- manual responsive/accessibility matrix ທີ່ 320/360/390/430px.

## 14. Rollout gates ແລະ release boundary

ກ່ອນ merge/release ຕ້ອງຜ່ານທຸກ gate:

1. frontend tests `npm.cmd test`;
2. Functions/backend tests `npm.cmd run test:functions`;
3. Rules tests `npm.cmd run test:rules`;
4. lint `npm.cmd run lint`;
5. production build `npm.cmd run build`;
6. whitespace/error scan `git diff --check`;
7. scope-lock diff ຕໍ່ baseline `10ad1d4` ຕ້ອງບໍ່ມີ change ໃນ Functions, Rules, indexes, Firebase config, Auth, query scope ແລະ permissions;
8. 320px overflow, select mouse/keyboard/touch, calendar mobile, Call/WhatsApp, terminology, role/branch acceptance matrix;
9. preview Hosting channel ກ່ອນ live;
10. capture live Hosting rollback point ແລະຢືນຢັນວ່າ release ເປັນ Hosting-only;
11. live deploy/rollback ເປັນຂັ້ນອະນຸມັດແຍກຕ່າງຫາກ—ບໍ່ deploy ໃນຂັ້ນ spec/plan ຫຼື implementation ທີ່ຍັງບໍ່ຜ່ານ gate.

Hosting-only ເປັນ release path ທີ່ອະນຸຍາດໄດ້ກໍ່ຕໍ່ເມື່ອ diff ພິສູດວ່າບໍ່ມີ backend/schema/security changes. Rollback ໃຊ້ cloned pre-release live Hosting version/channel ຫຼື Firebase Hosting Release History; ບໍ່ rebuild source ເກົ່າແລ້ວອ້າງວ່າເປັນ artifact ເດີມ.

## 15. Acceptance criteria

- ສີແລະ surfaces ສອດຄ່ອງກັບ White/Teal/Gray/Black + Orange boundary;
- visible native `<select>` ເຫຼືອ 0 ຈຸດໃນ app UI;
- Customer Meeting purpose ສະແດງ 1 field, submit ບໍ່ມີ `visitPurpose`, record ເກົ່າຍັງອ່ານໄດ້;
- `customer_visit` ແລະ `in_progress` ຄົງຄ່າ internal, ແຕ່ display text ເປັນ `ນັດພົບລູກຄ້າ` ແລະ `ກຳລັງດຳເນີນ` ທຸກຈຸດ;
- WhatsApp solid icon teal ແລະ Call solid icon gray ຢູ່ Customer Card, Customer Detail ແລະ linked customer ໃນ Activity Detail;
- Custom Select/Searchable Select/ModalSheet ໃຊ້ໄດ້ດ້ວຍ mouse, keyboard ແລະ touch;
- Calendar ແລະ admin/filter/forms ບໍ່ overflow ທີ່ 320px;
- controls ສຳຄັນມີ target ≥44px, focus-visible ແລະ accessible names;
- motion ຢູ່ 150–220ms ແລະ reduced-motion ຖືກເຄົາລົບ;
- frontend/backend/rules tests, lint, build ແລະ diff checks ຜ່ານ;
- Auth, branch visibility, query scope, Rules ແລະ permissions ບໍ່ປ່ຽນ;
- ບໍ່ມີ production deployment ຈົນກວ່າຈະມີອະນຸມັດແຍກ.
