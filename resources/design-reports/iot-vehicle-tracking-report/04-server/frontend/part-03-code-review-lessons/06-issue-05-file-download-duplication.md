## PHẦN XIII.9.6: VẤN ĐỀ 5 - FILE DOWNLOAD LOGIC LẶP LẠI

### XIII.9.6 Vấn Đề 5: File Download Logic Lặp Lại

#### Vấn Đề

**File:** `src/lib/api/export.ts`

Có **2 functions** download file với logic tương tự:

- `downloadBase64File()` - Download từ base64
- `downloadExport()` - Download từ blob

**Code lặp lại:**

```typescript
// downloadBase64File() - lines 10-45
const url = window.URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = fileName;
link.style.display = "none";
document.body.appendChild(link);
link.click();
setTimeout(() => {
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}, 100);

// downloadExport() - lines 116-123 (TƯƠNG TỰ)
const url = window.URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = fileName;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
window.URL.revokeObjectURL(url);
```

#### Giải Pháp

**Tạo utility function chung:**

```typescript
// src/lib/utils/file-download.ts
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}

export function downloadBase64(base64Data: string, fileName: string): void {
  // Validate and clean base64
  let cleanBase64 = base64Data;
  if (base64Data.includes(",")) {
    cleanBase64 = base64Data.split(",")[1];
  }

  // Convert to blob
  const byteCharacters = atob(cleanBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadBlob(blob, fileName);
}

// Usage
export const exportServices = {
  createExport: async (context: Export.ExportConfigInput) => {
    const response = await http.post<Export.ExportResponse>(
      "/exports",
      context
    );

    if (response.kind === "buffer" && response.data) {
      const fileName = response.fileName?.endsWith(".xlsx")
        ? response.fileName
        : `${response.fileName}.xlsx`;
      downloadBase64(response.data, fileName);
      notificationUtils.success("Xuất file thành công");
    }

    return response;
  },

  downloadExport: async (token: string) => {
    const { blob, headers } = await http.getBlob(`/exports/download/${token}`);
    const fileName = extractFileNameFromHeaders(headers) || "export.xlsx";
    downloadBlob(blob, fileName);
    notificationUtils.success("Tải file thành công");
  },
};
```

**Lợi ích:**

- ✅ DRY
- ✅ Reusable
- ✅ Consistent behavior

---

