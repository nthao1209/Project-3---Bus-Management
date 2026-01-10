import Header from "@/components/Header";
import { ClockCircleOutlined } from "@ant-design/icons";

export default function PendingApprovalPage() {
  return (
    <>
      <Header />

      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <ClockCircleOutlined className="text-3xl text-yellow-500" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Tài khoản đang chờ duyệt
          </h1>

          <p className="text-gray-600 leading-relaxed mb-6">
            Nhà xe của bạn đã được đăng ký thành công và hiện đang được 
            <span className="font-medium text-gray-800"> quản trị viên xem xét</span>.
            <br />
            Bạn sẽ có thể truy cập đầy đủ tính năng ngay sau khi được phê duyệt.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 text-yellow-700 text-sm font-medium">
            ⏳ Trạng thái: Đang chờ phê duyệt
          </div>

          <p className="mt-6 text-sm text-gray-400">
            Nếu quá 24 giờ chưa được duyệt, vui lòng liên hệ bộ phận hỗ trợ.
          </p>
        </div>
      </div>
    </>
  );
}
