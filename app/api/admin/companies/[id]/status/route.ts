import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Company, User } from '@/models/models';

type RouteParams = {
    params: Promise<{ id: string }>;
};

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    
    // 1. Lấy ID và Body
    const { id } = await params;
    const body = await req.json();
    const { status } = body; 

    console.log(`\n================= DEBUG START =================`);
    console.log(`[1] Admin đang cập nhật Company ID: ${id}`);
    console.log(`[2] Trạng thái mới mong muốn: ${status}`);

    // 2. Cập nhật Company trước
    const company = await Company.findByIdAndUpdate(
        id, 
        { status }, 
        { new: true } // Trả về data mới sau update
    );
    
    if (!company) {
        console.log(`[ERROR] Không tìm thấy Company với ID: ${id}`);
        return NextResponse.json({ message: 'Không tìm thấy nhà xe' }, { status: 404 });
    }

    console.log(`[3] Cập nhật Company thành công. Company Name: ${company.name}`);
    console.log(`[4] OwnerId của Company này là: ${company.ownerId}`);

    // 3. Lấy thông tin người tạo (Owner) từ User collection
    // .select('-password') để loại bỏ mật khẩu khỏi kết quả trả về cho an toàn
    const owner = await User.findById(company.ownerId).select('-password');

    if (owner) {
        console.log(`[5] Đã tìm thấy Owner: ${owner.name} - Email: ${owner.email} - Role hiện tại: ${owner.role}`);
    } else {
        console.log(`[WARN] Không tìm thấy User nào khớp với ownerId: ${company.ownerId}`);
    }

    // 4. Logic nâng quyền (Nếu status = active)
    if (status === 'active' && owner) {
        // Chỉ update nếu role chưa phải là owner hoặc admin
        if (owner.role !== 'owner' && owner.role !== 'admin') {
            console.log(`[6] Đang nâng cấp quyền user từ '${owner.role}' lên 'owner'...`);
            await User.findByIdAndUpdate(company.ownerId, { role: 'owner' });
            
            // Cập nhật lại biến owner local để trả về FE cho đúng
            owner.role = 'owner'; 
            console.log(`[7] Đã nâng cấp quyền thành công.`);
        } else {
            console.log(`[6] User này đã là '${owner.role}', không cần nâng cấp.`);
        }
    }

    console.log(`================= DEBUG END =================\n`);

    // 5. Trả về kết quả bao gồm cả Company và Owner info
    return NextResponse.json({ 
        success: true, 
        message: 'Cập nhật trạng thái thành công',
        data: {
            company,
            ownerInfo: owner // FE có thể dùng biến này để hiển thị tên người sở hữu
        }
    });

  } catch (error: any) {
    console.error(`[FATAL ERROR]:`, error);
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}