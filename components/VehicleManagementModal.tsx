
import React, { useState, useEffect, useRef } from 'react';
import { X, Car, Plus, Loader2, Edit3, Trash2, Save, Sparkles, UploadCloud, Crop } from 'lucide-react';
import { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { getVehicleConfig, UnifiedDropdown } from './SearchTrips';
import CopyableCode from './CopyableCode';

interface Vehicle {
  id: string;
  user_id: string;
  vehicle_type: string;
  license_plate: string;
  image_url?: string;
}

interface VehicleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onVehiclesUpdated: () => void;
}

const vehicleOptions = [
  { label: 'Sedan 4 chỗ', value: 'Sedan 4 chỗ' },
  { label: 'SUV 7 chỗ', value: 'SUV 7 chỗ' },
  { label: 'Limo Green 7 chỗ', value: 'Limo Green 7 chỗ' },
  { label: 'Limousine 9 chỗ', value: 'Limousine 9 chỗ' },
];

// Style chuẩn cho ô nhập liệu
const INPUT_STYLE = "w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-xl outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400";

const VehicleManagementModal: React.FC<VehicleManagementModalProps> = ({ isOpen, onClose, profile, onVehiclesUpdated }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [vehicleType, setVehicleType] = useState('Sedan 4 chỗ');
  const [licensePlate, setLicensePlate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  const resetForm = () => {
    setVehicleType('Sedan 4 chỗ');
    setLicensePlate('');
    setImageUrl('');
    setIsAdding(false);
    setEditingVehicle(null);
    setError(null);
    setUploading(false);
  };

  const fetchVehicles = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVehicles();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleType(vehicle.vehicle_type);
    setLicensePlate(vehicle.license_plate);
    setImageUrl(vehicle.image_url || '');
    setIsAdding(false);
  };

  // Hàm xử lý cắt ảnh tự động (Auto-Crop 16:9)
  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas error')); return; }

          // Kích thước mục tiêu: Tỷ lệ 16:9, Max width 1024px để tối ưu dung lượng
          const MAX_WIDTH = 1024;
          const TARGET_RATIO = 16 / 9;
          
          let srcW = img.width;
          let srcH = img.height;
          let srcX = 0;
          let srcY = 0;

          // Tính toán vùng cắt (Center Crop)
          if (srcW / srcH > TARGET_RATIO) {
             // Ảnh quá rộng -> Cắt bớt chiều ngang
             const newW = srcH * TARGET_RATIO;
             srcX = (srcW - newW) / 2;
             srcW = newW;
          } else {
             // Ảnh quá cao -> Cắt bớt chiều dọc
             const newH = srcW / TARGET_RATIO;
             srcY = (srcH - newH) / 2;
             srcH = newH;
          }

          // Resize về kích thước hợp lý
          canvas.width = Math.min(srcW, MAX_WIDTH);
          canvas.height = canvas.width / TARGET_RATIO;

          // Vẽ ảnh đã cắt và resize lên canvas
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

          // Xuất ra Blob (JPEG 90% quality)
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Compression error'));
          }, 'image/jpeg', 0.9);
        };
        img.onerror = () => reject(new Error('Lỗi tải ảnh'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError(null);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Vui lòng chọn một ảnh để tải lên.');
      }

      const originalFile = event.target.files[0];
      
      // Xử lý cắt ảnh trước khi upload
      const processedBlob = await processImage(originalFile);
      const processedFile = new File([processedBlob], originalFile.name, { type: 'image/jpeg' });

      const fileExt = 'jpg';
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-images') 
        .upload(filePath, processedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('vehicle-images').getPublicUrl(filePath);
      
      setImageUrl(data.publicUrl);
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Lỗi khi tải ảnh lên. Hãy chắc chắn bạn đã chạy SQL tạo bucket.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !licensePlate) {
      setError("Vui lòng điền đầy đủ thông tin Biển số xe.");
      return;
    }
    
    if (!imageUrl) {
        setError("Vui lòng tải lên hình ảnh xe.");
        return;
    }

    setLoading(true);
    setError(null);
    
    const payload = {
      vehicle_type: vehicleType,
      license_plate: licensePlate.toUpperCase(),
      image_url: imageUrl || null,
    };

    try {
      if (editingVehicle) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editingVehicle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicles').insert({ ...payload, user_id: profile.id });
        if (error) throw error;
      }
      resetForm();
      fetchVehicles();
      onVehiclesUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!window.confirm("Bạn có chắc muốn xoá xe này?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', vehicleId);
      if (error) throw error;
      fetchVehicles();
      onVehiclesUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div ref={modalRef} className="bg-white w-full max-w-4xl h-[85vh] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col relative border border-white/20">
        
        {/* Header */}
        <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 bg-white text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all duration-300 z-10 border border-slate-100 shadow-sm">
          <X size={20} />
        </button>
        
        <div className="p-8 bg-gradient-to-r from-emerald-50 via-white to-teal-50 shrink-0 border-b border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border border-emerald-100 shadow-sm rounded-2xl text-emerald-600"><Car size={24} /></div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-800">Quản lý đội xe</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Thêm, sửa, xoá thông tin các xe bạn sở hữu.</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3">
          <div className="md:col-span-2 overflow-y-auto custom-scrollbar p-8 bg-slate-50">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-slate-700">Danh sách xe ({vehicles.length})</h4>
              <button 
                onClick={handleStartAdd} 
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-200/50"
              >
                <Plus size={14} /> Thêm xe mới
              </button>
            </div>
            
            {loading && vehicles.length === 0 ? (
              <div className="text-center py-20"><Loader2 className="animate-spin text-slate-300 mx-auto" size={32} /></div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
                <Car size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-400">Chưa có xe nào được lưu.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vehicles.map(v => {
                  const config = getVehicleConfig(v.vehicle_type);
                  const VIcon = config.icon;
                  return (
                    <div key={v.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${editingVehicle?.id === v.id ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-200' : 'bg-white border-slate-100 hover:shadow-md'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden bg-slate-50 ${config.style}`}>
                          {v.image_url ? (
                            <img src={v.image_url} alt={v.license_plate} className="w-full h-full object-cover" />
                          ) : (
                            <VIcon size={24} />
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-1.5">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${config.style}`}>
                             <VIcon size={12} /> {v.vehicle_type}
                          </div>
                          <div className="inline-flex items-center bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-black tracking-wider">
                             <CopyableCode code={v.license_plate} label={v.license_plate} className="text-[10px]" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleStartEdit(v)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(v.id)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-rose-100 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-8 bg-white border-l border-slate-100 flex flex-col overflow-y-auto custom-scrollbar">
            {(isAdding || editingVehicle) ? (
              <form onSubmit={handleSubmit} className="space-y-5 flex flex-col flex-1">
                <h4 className="font-bold text-slate-800 text-lg">{editingVehicle ? 'Chỉnh sửa xe' : 'Thêm xe mới'}</h4>
                {error && <p className="text-xs text-rose-500 bg-rose-50 p-3 rounded-xl font-bold border border-rose-100 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>{error}</p>}
                
                {/* Unified Dropdown Integration with Badge */}
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">Loại xe</label>
                  <UnifiedDropdown
                    label="Chọn loại xe"
                    icon={Car}
                    value={vehicleType}
                    width="w-full"
                    showCheckbox={false}
                    isVehicle={true}
                    options={vehicleOptions}
                    onChange={(val: string) => setVehicleType(val)}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">Biển kiểm soát</label>
                  <input 
                    type="text" 
                    value={licensePlate} 
                    onChange={e => setLicensePlate(e.target.value.toUpperCase())} 
                    placeholder="VD: 29A-123.45" 
                    required 
                    className={INPUT_STYLE}
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block ml-1">Hình ảnh xe (Tự động cắt 16:9)</label>
                  <div className="w-full">
                    {imageUrl ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-36 bg-slate-50">
                        <img src={imageUrl} alt="Vehicle preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button 
                            type="button" 
                            onClick={() => setImageUrl('')}
                            className="px-4 py-2 bg-white text-rose-600 rounded-xl font-bold text-xs shadow-lg hover:bg-rose-50 transition-colors"
                          >
                            Xoá ảnh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-36 w-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group bg-slate-50/50"
                      >
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                             <Loader2 className="animate-spin text-emerald-500" size={24} />
                             <span className="text-[10px] font-bold text-emerald-600">Đang xử lý & cắt ảnh...</span>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 group-hover:scale-110 transition-transform relative">
                               <UploadCloud size={20} />
                               <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                                  <Crop size={8} />
                               </div>
                            </div>
                            <div className="text-center">
                               <span className="text-[10px] font-bold block">Bấm để tải ảnh từ máy</span>
                               <span className="text-[9px] font-medium opacity-70">Hệ thống sẽ tự động cắt 16:9</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>

                <div className="mt-auto pt-6 space-y-3">
                   <button type="submit" disabled={loading || uploading} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-200">
                     {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                     {editingVehicle ? 'Lưu thay đổi' : 'Thêm vào đội xe'}
                   </button>
                   <button type="button" onClick={resetForm} className="w-full py-3 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors">Hủy bỏ</button>
                </div>
              </form>
            ) : (
              <div className="text-center my-auto flex flex-col items-center p-6">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                  <Sparkles size={32} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-600">Chọn một xe để sửa</p>
                <p className="text-xs font-medium text-slate-400 mt-1">Hoặc thêm xe mới để bắt đầu nhận chuyến.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleManagementModal;
