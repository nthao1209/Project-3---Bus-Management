const BookingSummary = ({ tripData, selectedSeats, pickupSurcharge, totalAmount, onPay }: any) => (
  <Card className="shadow-md border-none sticky top-24" title="Chi tiết chuyến đi">
    {/* Nội dung tóm tắt lộ trình (giữ logic cũ) */}
    {/* ... */}
    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-4">
      <span>Tổng tiền:</span>
      <span className="text-blue-600">{totalAmount.toLocaleString()}đ</span>
    </div>
    <Button type="primary" size="large" block className="mt-6 h-12 bg-[#FFC700] text-black font-bold" onClick={onPay}>
      THANH TOÁN
    </Button>
  </Card>
);