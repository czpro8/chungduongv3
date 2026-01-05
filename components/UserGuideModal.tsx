
import React, { useState } from 'react';
import { 
  X, BookOpen, Clock, Play, CheckCircle2, XCircle, AlertCircle, Timer, 
  Search, Navigation, Zap, Sparkles, Phone, ShieldCheck, Info, ChevronRight,
  Car, Ticket, ShoppingBag, Shield, Users, MessageSquare, ListChecks, ArrowRight
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatusBadge = ({ icon: Icon, label, style }: any) => (
  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-normal ${style}`}>
    <Icon size={10} />
    {label}
  </div>
);

const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[48px] shadow-2xl overflow-visible animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col border border-white/20 relative">
        
        {/* Nút đóng Floating Red Button */}
        <button 
          onClick={onClose} 
          className="absolute -top-4 -right-4 w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 hover:rotate-90 hover:bg-rose-600 transition-all duration-300 z-[210] border-2 border-white"
        >
          <X size={26} strokeWidth={3} />
        </button>

        {/* Header Section */}
        <div className="p-10 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shrink-0 relative overflow-hidden rounded-t-[48px]">
          <div className="absolute top-0 right-0 p-16 opacity-10 rotate-12 scale-150">
            <BookOpen size={160} />
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl">
                  <BookOpen size={28} />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Cẩm nang vận hành</h2>
              </div>
              <p className="text-emerald-50 text-sm font-normal ml-1 flex items-center gap-2">
                <Sparkles size={16} /> Hệ thống quản lý xe tiện chuyến thông minh Chung đường
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-16">
          
          {/* Section 1: Trip Status */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-l-4 border-emerald-500 pl-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">1. Vòng đời của một chuyến xe</h3>
                <p className="text-xs font-normal text-slate-400 mt-1">Cập nhật tự động dựa trên thời gian thực</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: 'Chờ', icon: Clock, style: 'bg-amber-50 text-amber-600 border-amber-100', desc: 'Khi chuyến xe vừa được đăng. Đang nhận khách, thời gian khởi hành còn xa (> 6 tiếng).' },
                { label: 'Chuẩn bị', icon: Timer, style: 'bg-orange-50 text-orange-600 border-orange-100', desc: 'Tự động: 6 tiếng trước giờ khởi hành. Thẻ xe hiển thị viền Cam để gây chú ý.' },
                { label: 'Sát giờ', icon: AlertCircle, style: 'bg-rose-50 text-rose-600 border-rose-100', desc: 'Tự động: 1 tiếng trước giờ khởi hành. Thẻ xe hiển thị viền Đỏ khẩn cấp.' },
                { label: 'Đang chạy', icon: Play, style: 'bg-blue-50 text-blue-600 border-blue-100', desc: 'Tự động: Khi đến giờ khởi hành. Xe bắt đầu di chuyển trên lộ trình.' },
                { label: 'Hoàn thành', icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-600 border-emerald-100', desc: 'Tự động: Sau giờ dự kiến đến. Chuyến đi kết thúc thành công. Đóng nhận khách.' },
                { label: 'Đã huỷ', icon: XCircle, style: 'bg-rose-50 text-rose-500 border-rose-100', desc: 'Thủ công: Tài xế hoặc Admin nhấn huỷ do lý do khách quan.' },
              ].map((status, idx) => (
                <div key={idx} className="p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-300 group">
                  <div className="mb-4 flex justify-between items-center">
                    <StatusBadge icon={status.icon} label={status.label} style={status.style} />
                    <ChevronRight size={14} className="text-slate-200 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-normal">{status.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Booking Life Cycle */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-l-4 border-indigo-500 pl-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">2. Vòng đời đơn hàng</h3>
                <p className="text-xs font-normal text-slate-400 mt-1">Quản lý tương tác giữa Hành khách & Tài xế</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 p-6 bg-indigo-50/50 rounded-[32px] border border-indigo-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-lg">1</div>
                  <h4 className="font-bold text-slate-800 text-sm">Chờ duyệt (Pending)</h4>
                </div>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">Hành khách vừa nhấn "Đặt chỗ". Tài xế sẽ nhận được thông báo để kiểm tra đơn hàng.</p>
              </div>
              <div className="flex items-center justify-center text-indigo-200 hidden md:flex"><ArrowRight /></div>
              <div className="flex-1 p-6 bg-emerald-50/50 rounded-[32px] border border-emerald-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-lg">2</div>
                  <h4 className="font-bold text-slate-800 text-sm">Xác nhận (Confirmed)</h4>
                </div>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">Tài xế đồng ý đón khách. Hệ thống tự động trừ số ghế trống trên chuyến xe.</p>
              </div>
              <div className="flex items-center justify-center text-indigo-200 hidden md:flex"><ArrowRight /></div>
              <div className="flex-1 p-6 bg-rose-50/50 rounded-[32px] border border-rose-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-lg">3</div>
                  <h4 className="font-bold text-slate-800 text-sm">Từ chối (Rejected)</h4>
                </div>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">Tài xế không thể đón. Ghế sẽ được hoàn lại cho xe để hành khách khác đặt.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Smart Tools */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-l-4 border-sky-500 pl-6">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">3. Các công cụ thông minh</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-8 bg-slate-900 text-white rounded-[40px] shadow-2xl relative overflow-hidden group">
                <Search className="absolute -bottom-4 -right-4 text-white/5 group-hover:scale-110 transition-transform" size={120} />
                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Search size={24} /></div>
                  <h4 className="font-bold text-lg">Tìm kiếm thông minh</h4>
                  <p className="text-[11px] text-slate-400 font-normal leading-relaxed">Hỗ trợ gõ không dấu. "ha noi", "Ha Noi" hay "Hà Nội" đều cho kết quả chính xác 100%.</p>
                </div>
              </div>

              <div className="p-8 bg-indigo-600 text-white rounded-[40px] shadow-2xl relative overflow-hidden group">
                <Navigation className="absolute -bottom-4 -right-4 text-white/5 group-hover:scale-110 transition-transform" size={120} />
                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md"><Navigation size={24} /></div>
                  <h4 className="font-bold text-lg">Phân tích lộ trình AI</h4>
                  <p className="text-[11px] text-indigo-100 font-normal leading-relaxed">Gemini AI tự động tính toán quãng đường (km), thời gian và dự kiến giờ đến cho tài xế.</p>
                </div>
              </div>

              <div className="p-8 bg-emerald-500 text-white rounded-[40px] shadow-2xl relative overflow-hidden group">
                <Zap className="absolute -bottom-4 -right-4 text-white/5 group-hover:scale-110 transition-transform" size={120} />
                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg"><Zap size={24} /></div>
                  <h4 className="font-bold text-lg">Mã tra cứu nhanh</h4>
                  <p className="text-[11px] text-emerald-100 font-normal leading-relaxed">Click vào mã #Trp-XXXX hoặc #Ord-XXXX để sao chép nhanh và gửi cho đối tác qua Zalo/SMS.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Roles Guide */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-l-4 border-amber-500 pl-6">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">4. Hướng dẫn theo vai trò</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-white border-2 border-slate-100 rounded-[40px] space-y-6">
                <div className="flex items-center gap-3">
                  <Car className="text-emerald-600" size={24} />
                  <h4 className="font-bold text-slate-800">Dành cho Tài xế</h4>
                </div>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-xs font-normal text-slate-600">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Đăng chuyến xe: Dùng tính năng "Định kỳ" cho các lịch trình cố định.</span>
                  </li>
                  <li className="flex gap-3 text-xs font-normal text-slate-600">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span>Quản lý đơn hàng: Duyệt đơn trong 30p để tránh cảnh báo ⚠️.</span>
                  </li>
                </ul>
              </div>

              <div className="p-8 bg-white border-2 border-slate-100 rounded-[40px] space-y-6">
                <div className="flex items-center gap-3">
                  <Users className="text-indigo-600" size={24} />
                  <h4 className="font-bold text-slate-800">Dành cho Hành khách</h4>
                </div>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-xs font-normal text-slate-600">
                    <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />
                    <span>Tìm xe: Sử dụng bộ lọc "Loại xe" để chọn xe ưng ý.</span>
                  </li>
                  <li className="flex gap-3 text-xs font-normal text-slate-600">
                    <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />
                    <span>Theo dõi: Kiểm tra trạng thái đơn hàng thường xuyên.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Action Footer */}
        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0 rounded-b-[48px]">
          <div className="flex items-center gap-3 text-slate-400 text-xs font-normal">
            <Shield size={16} className="text-emerald-500" />
            An toàn • Tiết kiệm • Thông minh
          </div>
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-emerald-600 text-white font-bold text-sm rounded-3xl shadow-2xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-1 transition-all active:scale-95"
          >
            Sẵn sàng trải nghiệm!
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserGuideModal;
