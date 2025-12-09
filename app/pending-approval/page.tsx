export default function PendingApprovalPage() {
  return (
    <div className="flex items-center justify-center h-screen flex-col text-center">
      <h1 className="text-3xl font-bold mb-4">Tài khoản đang chờ duyệt</h1>
      <p className="text-gray-600">
        Nhà xe của bạn đang được quản trị viên xem xét. 
        Bạn sẽ nhận được thông báo ngay khi được phê duyệt.
      </p>
    </div>
  );
}
