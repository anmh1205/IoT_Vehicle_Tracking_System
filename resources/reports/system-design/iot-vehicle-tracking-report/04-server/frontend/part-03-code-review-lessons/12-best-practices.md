## PHẦN XIII.9.12: BEST PRACTICES

### XIII.9.12 Best Practices

1. **Separation of Concerns:**

   - Service layer: API calls only
   - Hook layer: State management + notifications
   - Component layer: UI only

2. **DRY Principle:**

   - Extract common logic to utilities
   - Use helper functions
   - Avoid code duplication

3. **Type Safety:**

   - Avoid `any` types
   - Define proper interfaces
   - Use TypeScript strictly

4. **Error Handling:**

   - Consistent error handling pattern
   - User-friendly error messages
   - Proper error logging

5. **Code Organization:**

   - Feature-based structure
   - Barrel exports
   - Clear file naming

---

**Lưu ý:** Tài liệu này dựa trên code review của `Example/frontend_v2`. Áp dụng các bài học này vào frontend mới để tránh lặp lại các vấn đề tương tự.

---

