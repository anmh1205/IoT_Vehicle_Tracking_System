# Bài học kinh nghiệm biên tập báo cáo từ review R1/R2

Tài liệu này tổng hợp các quy tắc viết và trình bày rút ra từ comment review R1, R2 và các lần biên tập trong phiên làm việc. Mục tiêu là dùng như checklist khi sửa các chương tiếp theo.

## 1. Vai trò từng phần trong báo cáo

- **Abstract:** Chỉ nêu bài toán, cấu trúc hệ thống, cách kiểm chứng và kết quả chính. Không đưa danh sách linh kiện, tên chip, tên framework hoặc cấu hình triển khai quá chi tiết.
- **Chương 1:** Giới thiệu vấn đề, mục tiêu, phạm vi và đầu ra. Không biến chương này thành phần mô tả hệ thống chi tiết; nếu quá dài thì phải rút về đúng vai trò giới thiệu.
- **Chương 2:** Phân tích vấn đề kỹ thuật, cơ sở kỹ thuật và yêu cầu thiết kế. Không lặp lại phần bối cảnh ở Chương 1.
- **Chương 3:** Đề xuất, so sánh và chọn phương án. Mục 3.2 có thể nêu tên các phương án cụ thể; Mục 3.3 mới phân tích phương án khả thi ở mức toàn hệ thống; Mục 3.4 tổng hợp cấu hình tối ưu.
- **Chương 4:** Trình bày triển khai và kết quả. Trình tự nên đi từ tổng quan thiết bị, khối chức năng, thiết kế PCB, nguyên mẫu thật, phần mềm thiết bị, máy chủ, giao diện, sau đó mới đến đo kiểm.
- **Chương 5:** Đánh giá theo mục tiêu và Phụ lục I. Tránh kể lại toàn bộ kết quả đo; phải trả lời hệ thống đã đạt gì, còn giới hạn gì, rủi ro nào cần kiểm soát.
- **Chương 6:** Viết đúng bốn đầu mục theo template: kiến thức đã vận dụng, vấn đề kỹ thuật phức tạp, tác động đạo đức - xã hội, tổng kết và bài học.

## 2. Cách viết văn kỹ thuật

- Ưu tiên câu ngắn, trực diện, có chủ ngữ rõ. Mỗi câu nên trả lời một ý kỹ thuật cụ thể.
- Tránh các câu mang giọng AI hoặc tuyên truyền như: "không chỉ... mà còn...", "bài toán không phải là... mà là...", "có thể thấy...", "quan trọng hơn...", "theo cách tổ chức này..." nếu không thật cần.
- Không viết meta về cách đang viết báo cáo, ví dụ: "để phần trình bày bám đúng quá trình phát triển..." hoặc "phần này sẽ...". Báo cáo chỉ trình bày nội dung kỹ thuật, không trình bày prompt hay ý định biên tập.
- Tránh câu khen chung chung. Không viết kiểu muốn làm người đọc tin rằng hệ thống tốt; hãy đưa số đo, điều kiện kiểm tra và kết luận kỹ thuật.
- Khi đoạn văn đang lặp ý, rút lại thành một câu kết luận hoặc chuyển sang bảng. Không viết lại thông tin đã có ở bảng, hình hoặc đoạn ngay trước đó.
- Với các đoạn có nhiều ý ngang hàng, dùng gạch đầu dòng. Mỗi gạch đầu dòng bắt đầu bằng cụm ý chính, sau đó mới giải thích ngắn.
- Không tự chế thêm thông tin chưa có trong đồ án. Nếu chưa đo, chưa triển khai hoặc chưa có tài liệu nguồn, không viết như đã hoàn thành.
- Dùng "đồ án" thống nhất trong thân báo cáo; hạn chế dùng "đề tài" trừ khi đang trích đúng tên biểu mẫu hoặc tên chính thức.

## 3. Cách dùng thuật ngữ

- Thuật ngữ kỹ thuật phải được giải thích khi xuất hiện lần đầu theo dạng: `MQTT` (Message Queuing Telemetry Transport - giao thức truyền bản tin nhẹ).
- Không lạm dụng tên công nghệ trong phần tổng quan hoặc bảng chức năng. Ví dụ, trong bảng chức năng máy chủ nên viết "cơ sở dữ liệu nghiệp vụ" thay vì đưa ngay `PostgreSQL` nếu tên công nghệ không giúp người đọc hiểu chức năng.
- Khi buộc phải dùng tên công nghệ, phải nói nó làm gì trong hệ thống. Không liệt kê `backend`, `API`, `broker`, `Docker`, `CI/CD`, `Socket.IO`, `PostgreSQL` như thể người đọc đã biết.
- Với người đọc không chuyên sâu IT/firmware, ưu tiên mô tả nguyên lý: thiết bị nhận dữ liệu gì, xử lý gì, gửi đi đâu, giao diện hiển thị gì.
- Không đổi thuật ngữ sang tiếng Việt gượng ép. Ví dụ `Cold Start`, `Warm Start`, `Hot Start` nên giữ từ gốc và thêm giải thích trong ngoặc.

## 4. Cách làm bảng

- Bảng phải có nhiệm vụ rõ: so sánh, đối chiếu, tổng hợp kết quả hoặc chốt lựa chọn. Không dùng bảng để lặp lại đoạn văn.
- Bảng so sánh phương án nên là engineering decision matrix: tiêu chí cốt lõi, trọng số hợp lý, điểm số có logic và kết luận đi thẳng vào phương án được chọn.
- Tiêu chí trong bảng phải bám ràng buộc thật của đồ án: ít xâm lấn, tương thích, năng lượng khi xe đỗ, khả năng đánh thức, ổn định đường truyền, khả năng lưu đệm, khả năng triển khai.
- Tránh tiêu chí chung chung như "dư địa firmware" nếu không giải thích được nó ảnh hưởng gì đến hệ thống.
- Sau bảng chỉ cần nêu kết luận và lý do chính. Không phân tích dài cả những phương án đã không chọn.
- Bảng đo kiểm phải phân biệt rõ: mục tiêu kiểm tra, cách quan sát, kết quả đo, mức đạt. Không viết các mục tiêu bằng câu lạ như "khả năng xuất hiện sớm của dữ liệu".

## 5. Cách dùng hình ảnh và sơ đồ

- Hình ảnh phải làm rõ cho kết luận đang trình bày. Đặt hình ngay gần đoạn cần chứng minh, không gom hình theo kiểu minh họa cho có.
- Sơ đồ nên thể hiện nguyên lý, luồng dữ liệu hoặc quan hệ giữa các khối. Hình chip hoặc ảnh linh kiện chỉ dùng khi thật sự cần nhận diện linh kiện đã chọn.
- Hình trong báo cáo phải đọc được khi in: nền sáng, chữ lớn, ưu tiên Times New Roman, ít màu, không có mũi tên đè chữ hoặc đường kẻ xuyên qua khung.
- Sơ đồ phải dùng tiếng Việt, viết hoa đầu câu/đầu cụm cho thống nhất, không lẫn tiếng Anh và tiếng Việt tùy tiện.
- Không dùng hình nửa thật nửa giả hoặc ảnh AI tạo cảm giác không đúng sản phẩm. Với phần triển khai, ưu tiên ảnh sản phẩm thật, PCB thật, giao diện thật hoặc sơ đồ nguyên lý tự vẽ rõ ràng.
- Ảnh layout PCB nên crop vào đúng bo mạch hoặc vùng thiết kế cần xem; không để cả giao diện phần mềm nếu nó làm loãng hình.
- Biểu đồ phải có trục, đơn vị, nhãn không chồng nhau và màu nhất quán. Nếu dùng các cột so sánh kết quả đo, màu cam thống nhất giúp người đọc nhận diện nhanh.

## 6. Cách trình bày chương 3

- Mục 3.1 đặt nền: nguyên lý hoạt động và ràng buộc kỹ thuật. Không đưa kết luận lựa chọn linh kiện vào đây.
- Mục 3.2 nêu các hướng giải pháp và so sánh bằng ma trận. Có thể nêu tên phương án như ESP32-S3, SIM7600CE-T, `vgate iCar Pro`, nhưng phải đặt trong vai trò "phương án được so sánh".
- Mục 3.3 phân tích phương án khả thi ở mức toàn hệ thống: thiết bị, máy chủ, giao diện phối hợp ra sao.
- Mục 3.4 chỉ tổng hợp cấu hình cuối cùng. Không lặp lại toàn bộ lập luận của 3.2 và 3.3.
- Các đoạn dẫn trong chương 3 cần đi thẳng vào ràng buộc kỹ thuật. Tránh dẫn nhập kiểu "từ bốn nhóm ràng buộc..." nếu câu chỉ có tác dụng nối văn.

## 7. Cách trình bày chương 4

- Phần phần cứng nên đi theo trình tự phát triển: tổng quan thiết bị, các khối chức năng, nguồn, thiết kế PCB, gia công - hàn lắp, lắp vỏ, lắp thử trên xe.
- Sơ đồ phần cứng không cần liệt kê toàn bộ chân hoặc chi tiết quá sâu. Người đọc cần hiểu khối nào làm chức năng gì và dữ liệu đi theo đường nào.
- Phần firmware nên trình bày theo nguyên lý vận hành: khởi động, thu dữ liệu, gửi bản tin, lưu đệm, ngủ sâu và đánh thức. Không biến phần này thành diễn giải code.
- Sơ đồ sequence trong Chương 4 chỉ nên thể hiện luồng nguyên lý, không viết chi tiết như tài liệu lập trình.
- Phần máy chủ cần giải thích vai trò từng lớp: tiếp nhận bản tin, kiểm tra - phân luồng, lưu trữ, cung cấp dữ liệu cho giao diện. Công nghệ triển khai chỉ đưa vào khi giúp làm rõ cách đã hiện thực.
- Phần giao diện cần bám thao tác vận hành: xem toàn đội, xem bản đồ, xem chi tiết thiết bị, xử lý cảnh báo. Không mở đầu bằng câu nặng thuật ngữ như `Next.js`, `React`, `Leaflet`, `Socket.IO` nếu chưa giải thích.
- Phần đo kiểm phải đưa đồ thị và bảng vào đúng chỗ: đồ thị làm rõ bản chất từng phép đo, bảng tổng hợp đặt sau khi người đọc đã thấy các kết quả chính.

## 8. Cách đánh giá chương 5 và chương 6

- Chương 5 phải xoay quanh mức đáp ứng mục tiêu trong Phụ lục I: nguồn 12-24 VDC, OBD-II, GPS, cảnh báo, ước tính chi phí, chi phí giới hạn, PCB, vỏ in 3D và kiểm chứng.
- Chi phí phải dùng số đã chốt: phần cứng 1.514.000 VND, SIM 8.000 VND/tháng/thiết bị, VPS khoảng 700.000 VND, tổng đầu tư ban đầu khoảng 2.214.000 VND.
- Chức năng ước tính chi phí đã hoàn thành thì không viết "đạt một phần".
- Mục môi trường là môi trường sống, không phải môi trường thử nghiệm. Chỉ viết các tác động có cơ sở như linh kiện điện tử, vỏ thiết bị, pin sạc dự phòng; không tự chế về vật liệu tái chế nếu không có nguồn.
- Rủi ro OBD-II không nên thổi phồng. Với nhóm thông số cơ bản, khác biệt giữa các dòng xe không phải vấn đề lớn; nó chỉ cần nhắc khi mở rộng sang tham số sâu hơn.
- Chương 6 phải viết như phần phản hồi học thuật: kiến thức đã vận dụng, vấn đề đã giải quyết, tác động xã hội - đạo đức và bài học cá nhân. Không viết thành phần tổng kết sản phẩm lần nữa.

## 9. Cách xử lý tài liệu tham khảo

- Trích dẫn phải theo thứ tự xuất hiện trong báo cáo. Sau khi một tài liệu đã được đánh số, lần nhắc lại dùng lại số cũ.
- Chỉ đưa tài liệu thực sự đã dùng và có vai trò trong lập luận. Không nhồi tài liệu để danh mục dài hơn.
- Tài liệu kỹ thuật như datasheet, chuẩn, thông số sản phẩm phải khớp với phần nội dung dùng trong báo cáo.
- Nếu trích thông tin thị trường hoặc thông số sản phẩm, cần có nguồn ngay tại chỗ hoặc trong bảng.

## 10. Checklist trước khi chốt một phần

- Đọc lại từng đoạn và hỏi: câu này có thêm thông tin kỹ thuật mới không? Nếu không, xóa hoặc gộp.
- Kiểm tra có câu "AI" không: dài, vòng, nhiều từ trừu tượng, khen chung chung, hoặc dùng cấu trúc đối lập sáo rỗng.
- Kiểm tra hình: chữ đủ lớn, không đè mũi tên, không có đường xuyên qua chữ, nền rõ, caption nói đúng ý hình.
- Kiểm tra bảng: tiêu chí có phải tiêu chí thật không, trọng số có hợp lý không, kết luận sau bảng có ngắn không.
- Kiểm tra thuật ngữ: tên tiếng Anh có giải thích tiếng Việt ngắn gọn chưa, có thuật ngữ nào bị đưa vào chỉ để trông "kỹ thuật" không.
- Kiểm tra phạm vi: có phần nào viết sang chương khác không; có viết lại nội dung người dùng đã xóa không.

## 11. Câu hỏi chưa giải quyết

Không có.
