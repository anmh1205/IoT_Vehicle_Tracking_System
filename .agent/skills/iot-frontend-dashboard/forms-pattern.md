# Forms Pattern

> Every form is a contract between user intent and server state. Validate early, submit confidently, provide feedback immediately.

---

## Form Stack

```
Form technology stack:
│
├── react-hook-form              # Form state management
│   ├── useForm hook             # Register fields, track dirty/errors
│   ├── Controller               # For controlled components (Select, DatePicker)
│   └── FormProvider             # Share form context across nested components
│
├── @hookform/resolvers/zod      # Validation bridge
│   └── zodResolver(schema)      # Zod schema drives client-side validation
│
├── zod                          # Schema definition
│   ├── Define shape             # z.object({ name: z.string().min(1) })
│   ├── Infer types              # z.infer<typeof schema>
│   └── Reuse across client/API  # Same schema validates both sides
│
└── shadcn/ui Form components    # Styled form UI
    ├── Form                     # FormProvider wrapper
    ├── FormField                # Connects react-hook-form to UI
    ├── FormItem                 # Layout wrapper for label + input + error
    ├── FormLabel                # Label with htmlFor
    ├── FormControl              # Input wrapper
    ├── FormDescription          # Help text below input
    └── FormMessage              # Validation error message
```

## Dialog vs Sheet vs Full Page

```
Form container decision:
│
├── How many fields?
│   ├── 1-5 fields (simple entity)
│   │   └── Dialog (centered modal)
│   │       ├── Quick, focused interaction
│   │       ├── User stays in context
│   │       └── Close on submit success
│   │
│   ├── 6-12 fields (moderate entity)
│   │   └── Sheet (slide-in panel)
│   │       ├── More vertical space
│   │       ├── Can scroll within sheet
│   │       └── User sees table behind sheet
│   │
│   └── 12+ fields or multi-step
│       └── Full page or Sheet with tabs
│           ├── Tabbed sections
│           ├── Progress indicator
│           └── Save draft capability
│
├── Is it a create or edit operation?
│   ├── Create: Dialog or Sheet (user returns to list after)
│   └── Edit: Same container as create (pre-populated)
│
└── Does it need side-by-side reference?
    ├── YES --> Sheet (user sees context behind it)
    └── NO  --> Dialog (focused, no distractions)
```

## Submit Flow

```
Form submission lifecycle:
│
├── 1. User clicks Submit
│
├── 2. Client-side validation (zod + react-hook-form)
│   ├── PASS --> Continue to step 3
│   └── FAIL --> Show inline errors per field
│       ├── Focus first invalid field
│       └── FormMessage shows error below field
│
├── 3. Disable submit button + show loading spinner
│   └── Prevent double submission
│
├── 4. API call via TanStack Query useMutation
│   ├── SUCCESS:
│   │   ├── Toast success message (sonner)
│   │   ├── Close dialog/sheet
│   │   ├── Reset form state
│   │   └── Invalidate related queries (list refetches)
│   │
│   └── ERROR:
│       ├── Toast error message with details
│       ├── Keep dialog/sheet open
│       ├── Keep form values (user can retry)
│       └── If server returns field errors, set them on form
│
└── 5. UI updates automatically (TanStack Query refetch)
```

## Optimistic Update vs Wait for Server

```
Update strategy decision:
│
├── Is the operation likely to succeed (> 95%)?
│   ├── YES --> Optimistic update
│   │   ├── Update UI immediately
│   │   ├── Send API request in background
│   │   ├── Revert on error
│   │   └── Examples: toggle status, rename, reorder
│   │
│   └── NO --> Wait for server
│       ├── Show loading state
│       ├── Update UI after server confirms
│       └── Examples: create, complex validation, payment
│
├── Is the operation destructive?
│   ├── YES --> Wait for server (never optimistic delete without undo)
│   └── NO  --> Optimistic is safe
│
└── Default for IoT dashboard:
    ├── CRUD create/delete --> Wait for server
    ├── Status toggles    --> Optimistic with rollback
    └── Settings updates  --> Wait for server
```

## Form Field Patterns

```
Common field types and their components:
│
├── Text input:       Input (shadcn/ui)
├── Long text:        Textarea
├── Number:           Input type="number"
├── Select (few):     Select (shadcn/ui) with SelectTrigger
├── Select (many):    Combobox (Command + Popover)
├── Multi-select:     Combobox with multiple
├── Date:             DatePicker (Calendar + Popover)
├── Date range:       DateRangePicker
├── Toggle:           Switch
├── Checkbox:         Checkbox
├── File upload:      Custom dropzone component
│
└── Controlled components (Select, DatePicker, Combobox):
    └── Use Controller from react-hook-form
        ├── render prop provides field value + onChange
        └── Bridges uncontrolled react-hook-form with controlled shadcn/ui
```

## Delete Confirmation Pattern

```
Destructive action flow:
│
├── User clicks Delete in row actions
│
├── AlertDialog opens (NOT a toast, NOT inline)
│   ├── Title: "Delete {entity name}?"
│   ├── Description: consequences of deletion
│   ├── Cancel button (secondary)
│   └── Delete button (destructive variant)
│
├── User confirms --> useMutation fires DELETE
│   ├── Loading state on confirm button
│   ├── On success: toast, close dialog, invalidate queries
│   └── On error: toast error, keep dialog open
│
└── For bulk delete:
    ├── "Delete X items?" with count
    └── List affected items if fewer than 5
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Manual form state with useState per field | No validation, no dirty tracking, verbose | react-hook-form + zod |
| No validation feedback until submit | Poor UX, user guesses what is wrong | Inline errors as user types (mode: "onChange") |
| Submit button enabled during loading | Double submission | Disable button + show spinner during mutation |
| Dialog stays open on success | User must manually close | Auto-close on successful mutation |
| Form values lost on error | User must re-enter everything | Keep form open and populated on error |
| Alert/confirm via window.confirm | Ugly, not styled, blocking | shadcn/ui AlertDialog |
| Validation only on client | Server rejects, no useful error shown | Server errors mapped back to form fields |
