# Research Report: API response standards cho REST backend TypeScript/Node

Timestamp: 2026-03-31 04:25 Asia/Saigon

## Findings
- RFC 7807 là chuẩn mạnh nhất cho error response HTTP: nhỏ, rõ, machine-readable, dùng các field cốt lõi `type`, `title`, `status`, `detail`, `instance` + extension members khi cần. Phù hợp nhất cho REST backend muốn chuẩn hóa lỗi mà không ép success payload. [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807)
- JSON:API chuẩn hóa rất rõ phần `errors`, nhưng nó là spec cho toàn bộ format JSON:API, không chỉ error. Success payload của nó theo `data/attributes/relationships/meta`, không phải “envelope” tự do. Nếu không dùng full JSON:API, không nên chỉ lấy riêng error shape rồi bỏ phần còn lại. [JSON:API](https://jsonapi.org/)
- JSend là format rất đơn giản: `status: success|fail|error`, kèm `data` hoặc `message`. Ưu điểm: dễ hiểu, dễ migrate. Nhược: không phải RFC/standard IETF, hệ sinh thái và tính chặt chẽ thấp hơn RFC 7807. [JSend repo](https://github.com/omniti-labs/jsend)
- Microsoft REST API Guidelines nhấn mạnh consistency, status code đúng nghĩa, error response tách khỏi success flow, và dùng một shape lỗi thống nhất để client xử lý chung. Tinh thần gần RFC 7807 hơn JSend. [Microsoft error guidance](https://github.com/microsoft/api-guidelines/blob/vNext/graph/articles/errorResponses.md), [Graph errors](https://learn.microsoft.com/en-us/graph/errors)
- Google AIP-193 khuyến nghị error response chuẩn hóa để client có common error handling logic, machine-readable details, và dùng error model nhất quán across services. Rất hợp cho backend enterprise/SDK-friendly. [AIP-193](https://google.aip.dev/193)

## Comparison
- RFC 7807: best default cho REST API thuần HTTP, nhất là public API.
- JSON:API: chỉ chọn khi bạn cam kết dùng full JSON:API contract end-to-end.
- JSend: tốt cho app nội bộ/legacy cần tối giản, nhưng kém chuẩn hóa hơn.
- Microsoft + AIP-193: không phải envelope spec độc lập, nhưng là guideline tốt về error consistency, status code, machine-readable fields.
- Với TypeScript/Node, RFC 7807 + extension fields là điểm cân bằng tốt nhất giữa chuẩn, đơn giản, và khả năng map sang domain errors.

## Recommendation
- Chọn RFC 7807 làm chuẩn lỗi mặc định.
- Giữ success response tối giản: trả JSON resource trực tiếp hoặc envelope nội bộ nếu team thật sự cần pagination/meta thống nhất.
- Nếu cần wrapper cho mọi response, dùng envelope riêng của dự án, nhưng không “bắt chước” JSON:API/JSend nửa vời.
- Map domain errors -> HTTP status -> problem detail extension fields (`code`, `traceId`, `errors[]`, `fieldErrors`).
- Bắt buộc consistency: mọi lỗi validation/authorization/not-found/internal đều phải qua cùng serializer.

## Migration Notes
- Từ JSend: map `success` -> 2xx payload hiện tại; map `fail/error` -> RFC 7807 problem details.
- Từ custom envelope: giữ nguyên success shape ngắn hạn; chỉ chuẩn hóa error trước để giảm breaking changes.
- Nếu đang dùng JSON:API error object, có thể giữ `errors[]` nhưng thêm `type/title/status/detail` tương đương để dễ bridge.
- Đừng thay đổi cả success và error cùng lúc. Ưu tiên error first, rồi mới cân nhắc envelope success.

## Unresolved Questions
- API hiện tại cần public contract chặt hay chỉ nội bộ?
- Có yêu cầu multiple errors per request ở mức field-level không?
- Có cần compatibility với client cũ đang parse envelope riêng không?
- Có muốn adopt full JSON:API hay chỉ borrow error semantics?
