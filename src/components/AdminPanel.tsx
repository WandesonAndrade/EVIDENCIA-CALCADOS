import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Order, OrderStatus, PaymentStatus, UserProfile, Category, HeroBanner, HomeSectionConfig, AboutConfig, ContactConfig } from '../types';
import { MoblinkIntegrationPanel } from './MoblinkIntegrationPanel';
import { MoblinkProductsManager } from './MoblinkProductsManager';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthScreen } from './AuthScreen';
import { TeamManagement } from './TeamManagement';
import { checkIsProfileComplete } from '../App';
import { storage, db, auth, app } from '../lib/firebase';



import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDocs, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { 
  Package, DollarSign, Users, RefreshCw, Plus, 
  Trash2, Edit, Save, ToggleLeft, ToggleRight, 
  Upload, Check, AlertCircle, ShoppingBag, Eye,
  BarChart, Layers, MessageSquare, Search, Filter, 
  Settings, ArrowLeft, UserCheck, EyeOff, ChevronRight, 
  Info, Sliders, Zap, Barcode, Image, ArrowUp, ArrowDown,
  BookOpen, PhoneCall, Globe, CheckCircle2, Sparkles, Layout, HelpCircle,
  FileText, Briefcase, MapPin, Gift, Heart, ShoppingCart, Cake, AlertTriangle, LogOut, Shield
} from 'lucide-react';

type AdminTab = 
  | 'overview' 
  | 'inventory' 
  | 'sales' 
  | 'crediario'
  | 'customers' 
  | 'new-product' 
  | 'categories' 
  | 'moblink' 
  | 'banners' 
  | 'home-sections' 
  | 'about-editor' 
  | 'support-contact' 
  | 'settings'
  | 'team';

export const AdminPanel: React.FC = () => {
  const { 
    products, 
    orders, 
    currentUser,
    currentAdminUser,
    registerTeamMember,
    logoutAdmin, 
    setCurrentView,
    addProduct,
    deleteProduct,
    updateProduct,
    updateOrderStatus,
    updateOrderPaymentStatus,
    updateOrderFreight,
    assignOrderSeller,
    theme,
    toggleTheme,
    categories,
    addCategory,
    deleteCategory,
    updateCategory,
    heroBanners,
    updateHeroBanners,
    homeSections,
    updateHomeSections,
    aboutConfig,
    updateAboutConfig,
    contactConfig,
    updateContactConfig,
    restoreDefaultConfig,
    atualizarStatusCrediario,
    updateUserCashback
  } = useApp();

  const activeAdminUser = currentAdminUser || currentUser;
  const isAdmin = true; // Todo colaborador autenticado no painel possui privilégio total de Administrador
  const isSeller = false;

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);





  // Team Registration Modal State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [teamEmailInput, setTeamEmailInput] = useState('');
  const [teamRoleInput, setTeamRoleInput] = useState<'admin' | 'seller'>('seller');
  const [teamTempPassInput, setTeamTempPassInput] = useState('evidencia2026');


  // Toast Notification System State
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const addToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleRegisterTeamMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim() || !teamEmailInput.trim() || !teamTempPassInput.trim()) {
      addToast("Campos Obrigatórios", "Por favor preencha todos os campos do pré-cadastro.", "error");
      return;
    }

    try {
      await registerTeamMember(teamNameInput.trim(), teamEmailInput.trim(), teamRoleInput, teamTempPassInput.trim());
      addToast("Membro Cadastrado!", `${teamNameInput} registrado como ${teamRoleInput.toUpperCase()}.`, "success");
      setIsTeamModalOpen(false);
      setTeamNameInput('');
      setTeamEmailInput('');
      setTeamTempPassInput('evidencia2026');
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      addToast("Erro no Cadastro", err.message || "Não foi possível cadastrar o usuário.", "error");
    }
  };


  // Home Section Editing Modal State
  const [editingSection, setEditingSection] = useState<HomeSectionConfig | null>(null);
  const [sectionNameInput, setSectionNameInput] = useState('');
  const [sectionDescInput, setSectionDescInput] = useState('');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);

  // Category management Form States
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFeedback, setCategoryFeedback] = useState('');
  
  // New Product Form States
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState('');
  const [newProdOnSale, setNewProdOnSale] = useState(false);
  const [newProdCategory, setNewProdCategory] = useState('Sapatos Sociais');
  const [newProdProductType, setNewProdProductType] = useState<'calçados' | 'roupas' | 'acessórios' | 'perfumes' | 'eletrônicos' | 'geral'>('calçados');
  const [newProdSizes, setNewProdSizes] = useState<(number | string)[]>([35, 36, 37, 38, 39, 40]);
  const [customSizeInput, setCustomSizeInput] = useState('');
  
  // Dynamic Product Attributes
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdGender, setNewProdGender] = useState('');
  const [newProdMaterial, setNewProdMaterial] = useState('');
  const [newProdColor, setNewProdColor] = useState('');
  const [newProdModelOrSku, setNewProdModelOrSku] = useState('');
  const [newProdWarrantyOrVolume, setNewProdWarrantyOrVolume] = useState('');
  const [newProdCustomAttrs, setNewProdCustomAttrs] = useState<{ label: string; value: string }[]>([]);

  const [newProdImages, setNewProdImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newProdCrediario, setNewProdCrediario] = useState(true);
  const [newProdVisible, setNewProdVisible] = useState(true);
  const [newProdStockControl, setNewProdStockControl] = useState(true);
  const [newProdStock, setNewProdStock] = useState('10');
  
  // Cloudinary States
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(
    (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || localStorage.getItem('cloudinary_cloud_name') || ''
  );
  const [cloudinaryUploadPreset, setCloudinaryUploadPreset] = useState(
    (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || localStorage.getItem('cloudinary_upload_preset') || ''
  );

  // CMS 1: Hero Banners State & Form
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [bannerBadge, setBannerBadge] = useState('');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDesc, setBannerDesc] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerBtnText, setBannerBtnText] = useState('');
  const [bannerTabKey, setBannerTabKey] = useState('lançamentos');
  const [bannerActive, setBannerActive] = useState(true);
  const [cmsFeedback, setCmsFeedback] = useState('');

  // CMS 2: About Us State & Form
  const [aboutTitle, setAboutTitle] = useState(aboutConfig?.title || '');
  const [aboutSubtitle, setAboutSubtitle] = useState(aboutConfig?.subtitle || '');
  const [aboutDescription, setAboutDescription] = useState(aboutConfig?.description || '');
  const [aboutImage, setAboutImage] = useState(aboutConfig?.highlightImage || '');
  const [aboutBadge, setAboutBadge] = useState(aboutConfig?.badgeText || '');

  // CMS 3: Contact & Support State & Form
  const [contactWhatsApp, setContactWhatsApp] = useState(contactConfig?.whatsapp || '5599984684867');
  const [contactEmail, setContactEmail] = useState(contactConfig?.email || 'contato@evidencia.com.br');
  const [contactAddress, setContactAddress] = useState(contactConfig?.address || 'Rua Afonso Pena, 295 - Centro, Caxias - MA');
  const [contactHours, setContactHours] = useState(contactConfig?.hours || 'Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 13:00');
  const [promoText, setPromoText] = useState(contactConfig?.promoBannerText || 'Frete grátis para todo Brasil em compras acima de R$ 350!');
  const [isPromoActive, setIsPromoActive] = useState(contactConfig?.isPromoBannerActive ?? true);

  // Sync state when props update
  useEffect(() => {
    if (aboutConfig) {
      setAboutTitle(aboutConfig.title);
      setAboutSubtitle(aboutConfig.subtitle);
      setAboutDescription(aboutConfig.description);
      setAboutImage(aboutConfig.highlightImage);
      setAboutBadge(aboutConfig.badgeText);
    }
  }, [aboutConfig]);

  useEffect(() => {
    if (contactConfig) {
      setContactWhatsApp(contactConfig.whatsapp);
      setContactEmail(contactConfig.email);
      setContactAddress(contactConfig.address);
      setContactHours(contactConfig.hours);
      setPromoText(contactConfig.promoBannerText);
      setIsPromoActive(contactConfig.isPromoBannerActive);
    }
  }, [contactConfig]);

  // Upload & Feedback States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState('');
  const [formFeedback, setFormFeedback] = useState('');

  // Catalog Filters States
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('Todos');
  const [catalogVisibilityFilter, setCatalogVisibilityFilter] = useState('Todos');

  // Orders Filters States
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'Todos' | OrderStatus>('Todos');
  const [ordersPaymentFilter, setOrdersPaymentFilter] = useState<'Todos' | PaymentStatus>('Todos');
  const [ordersSellerFilter, setOrdersSellerFilter] = useState<string>('Todos');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [editingFreightMap, setEditingFreightMap] = useState<{ [orderId: string]: string }>({});


  // Users Management States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [birthdayFilter, setBirthdayFilter] = useState<'Todos' | 'Dia' | 'Semana' | 'Mês'>('Todos');
  const [registrationFilter, setRegistrationFilter] = useState<'Todos' | 'Completo' | 'Incompleto'>('Todos');
  const [editingCashbackMap, setEditingCashbackMap] = useState<{ [uid: string]: { balance: string; validUntil: string } }>({});

  // Fetch users collection from Firestore for Crediário Analysis
  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const fetched: UserProfile[] = [];
      snap.forEach(docSnap => {
        fetched.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      setUsers(fetched);
    } catch (e) {
      console.warn("Could not fetch users from Firestore, using local fallback:", e);
      const saved = localStorage.getItem('evidencia_local_users');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUsers(Object.values(parsed));
        } catch (_) {}
      }
    }
  };

  useEffect(() => {
    fetchUsers();

    // Real-time listener for users engagement (cart & favorites)
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetched: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        fetched.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      if (fetched.length > 0) {
        setUsers(fetched);
      }
    }, (err) => {
      console.warn("Firestore users listener warning:", err);
    });

    return () => unsubscribe();
  }, []);

  const isBirthdayMatch = (userDateStr: string | undefined, filter: 'Dia' | 'Semana' | 'Mês'): boolean => {
    if (!userDateStr) return false;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    let bMonth = -1;
    let bDay = -1;

    if (userDateStr.includes('-')) {
      const parts = userDateStr.split('-');
      if (parts.length >= 3) {
        bMonth = parseInt(parts[1], 10) - 1;
        bDay = parseInt(parts[2], 10);
      }
    } else if (userDateStr.includes('/')) {
      const parts = userDateStr.split('/');
      if (parts.length >= 3) {
        bDay = parseInt(parts[0], 10);
        bMonth = parseInt(parts[1], 10) - 1;
      }
    }

    if (bMonth === -1 || bDay === -1 || isNaN(bMonth) || isNaN(bDay)) return false;

    if (filter === 'Dia') {
      return bMonth === currentMonth && bDay === currentDay;
    }

    if (filter === 'Mês') {
      return bMonth === currentMonth;
    }

    if (filter === 'Semana') {
      if (bMonth !== currentMonth) return false;
      const diffDays = Math.abs(bDay - currentDay);
      return diffDays <= 3;
    }

    return false;
  };

  const handleAprovarCrediario = async (user: UserProfile) => {
    try {
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, crediarioStatus: 'Aprovado', crediarioAnalisadoEm: new Date().toISOString() } : u));
      await atualizarStatusCrediario(user.uid, 'Aprovado');
      addToast('Crediário Aprovado!', `O crediário de ${user.name} foi aprovado com sucesso.`, 'success');
      fetchUsers();
    } catch (err) {
      addToast('Erro na Aprovação', 'Não foi possível atualizar o status do crediário.', 'error');
    }
  };

  const handleRejeitarCrediario = async (user: UserProfile) => {
    try {
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, crediarioStatus: 'Rejeitado', crediarioAnalisadoEm: new Date().toISOString() } : u));
      await atualizarStatusCrediario(user.uid, 'Rejeitado');
      addToast('Crediário Recusado', `O crediário de ${user.name} foi recusado.`, 'info');
      fetchUsers();
    } catch (err) {
      addToast('Erro ao Rejeitar', 'Não foi possível atualizar o status do crediário.', 'error');
    }
  };

  // Inline Quick Stock edit variables
  const [inlineStockValue, setInlineStockValue] = useState<{ [key: string]: number }>({});

  const isDark = theme === 'dark';

  // --- CMS 1: BANNER ACTIONS ---
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerBadge('NOVA COLEÇÃO 2026');
    setBannerTitle('');
    setBannerDesc('');
    setBannerImage('');
    setBannerBtnText('Ver Lançamentos');
    setBannerTabKey('lançamentos');
    setBannerActive(true);
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: HeroBanner) => {
    setEditingBanner(b);
    setBannerBadge(b.badge);
    setBannerTitle(b.title);
    setBannerDesc(b.description);
    setBannerImage(b.image);
    setBannerBtnText(b.buttonText);
    setBannerTabKey(b.tabKey);
    setBannerActive(b.active);
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle || !bannerImage) {
      addToast('Campos Obrigatórios', 'Por favor, preencha o Título e a URL da Imagem do Banner.', 'error');
      return;
    }

    try {
      let updatedBanners = [...(heroBanners || [])];
      if (editingBanner) {
        updatedBanners = updatedBanners.map(b => 
          b.id === editingBanner.id 
            ? { ...b, badge: bannerBadge, title: bannerTitle, description: bannerDesc, image: bannerImage, buttonText: bannerBtnText, tabKey: bannerTabKey, active: bannerActive } 
            : b
        );
      } else {
        const newB: HeroBanner = {
          id: `banner-${Date.now()}`,
          badge: bannerBadge || 'DESTAQUE',
          title: bannerTitle,
          description: bannerDesc,
          image: bannerImage,
          buttonText: bannerBtnText || 'Explorar Coleção',
          tabKey: bannerTabKey || 'lançamentos',
          active: bannerActive
        };
        updatedBanners.push(newB);
      }

      await updateHeroBanners(updatedBanners);
      setIsBannerModalOpen(false);
      addToast('Banner Salvo!', 'O banner hero foi atualizado e sincronizado no Firestore.');
    } catch (err: any) {
      console.error("Erro ao salvar banner no Firestore:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore. Tente novamente.', 'error');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este banner?')) return;
    try {
      const updated = (heroBanners || []).filter(b => b.id !== id);
      await updateHeroBanners(updated);
      addToast('Banner Removido!', 'O banner foi excluído do carrossel principal.');
    } catch (err: any) {
      console.error("Erro ao deletar banner no Firestore:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  const handleToggleBannerActive = async (id: string) => {
    try {
      const updated = (heroBanners || []).map(b => b.id === id ? { ...b, active: !b.active } : b);
      await updateHeroBanners(updated);
      addToast('Status Atualizado!', 'A visibilidade do banner foi alterada.');
    } catch (err: any) {
      console.error("Erro ao alterar status do banner:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  // --- CMS 2: HOME SECTIONS REORDERING & EDITING ---
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    try {
      const list = [...(homeSections || [])];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return;
      const temp = list[index];
      list[index] = list[targetIdx];
      list[targetIdx] = temp;
      await updateHomeSections(list);
      addToast('Seções Reordenadas!', 'A nova sequência de seções foi atualizada.');
    } catch (err: any) {
      console.error("Erro ao reordenar seções:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  const handleSaveHomeSectionsOrder = async () => {
    try {
      await updateHomeSections(homeSections || []);
      addToast('Ordem salva com sucesso!', 'A nova ordem exata das seções da Home foi enviada para o Firestore.');
    } catch (err: any) {
      console.error("Erro ao salvar ordem das seções:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  const handleToggleSectionEnabled = async (id: string) => {
    try {
      const list = (homeSections || []).map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
      await updateHomeSections(list);
      addToast('Visibilidade Alterada!', 'O status da seção foi sincronizado com a loja.');
    } catch (err: any) {
      console.error("Erro ao alterar visibilidade da seção:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  const handleOpenEditSection = (sec: HomeSectionConfig) => {
    setEditingSection(sec);
    setSectionNameInput(sec.name);
    setSectionDescInput(sec.description);
    setIsSectionModalOpen(true);
  };

  const handleSaveSectionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    try {
      const updatedList = (homeSections || []).map(s =>
        s.id === editingSection.id ? { ...s, name: sectionNameInput, description: sectionDescInput } : s
      );
      await updateHomeSections(updatedList);
      setIsSectionModalOpen(false);
      addToast('Seção Atualizada!', `A seção "${sectionNameInput}" foi salva no Firestore.`);
    } catch (err: any) {
      console.error("Erro ao editar seção:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  // --- CMS 3: ABOUT US SAVE ---
  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAboutConfig({
        title: aboutTitle,
        subtitle: aboutSubtitle,
        description: aboutDescription,
        highlightImage: aboutImage,
        badgeText: aboutBadge
      });
      addToast('Conteúdo Institucional!', 'As informações do "Sobre Nós" foram salvas no Firestore.');
    } catch (err: any) {
      console.error("Erro ao salvar Sobre Nós:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  // --- CMS 4: CONTACT SAVE ---
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateContactConfig({
        whatsapp: contactWhatsApp,
        email: contactEmail,
        address: contactAddress,
        hours: contactHours,
        promoBannerText: promoText,
        isPromoBannerActive: isPromoActive
      });
      addToast('Suporte & Contatos!', 'Os contatos e o banner promocional foram atualizados no Firestore.');
    } catch (err: any) {
      console.error("Erro ao salvar contatos:", err);
      addToast('Erro ao Salvar', 'Permissão negada ou erro de conexão com o Firestore.', 'error');
    }
  };

  // Cloudinary Upload Handler with File Security Validations
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField?: 'product' | 'banner' | 'about') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Security Validation 1: MIME Type Restriction (image/png, image/jpeg, image/webp)
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      addToast('Arquivo Inválido', 'Por favor, selecione apenas imagens nos formatos PNG, JPG, JPEG ou WEBP.', 'error');
      return;
    }

    // Security Validation 2: Maximum File Size Limit (5MB)
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addToast('Arquivo Muito Grande', 'O tamanho máximo da imagem permitida é de 5MB.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadFeedback('Enviando imagem...');

    try {
      if (cloudinaryCloudName && cloudinaryUploadPreset) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryUploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          const url = data.secure_url;
          if (targetField === 'banner') setBannerImage(url);
          else if (targetField === 'about') setAboutImage(url);
          else setNewProdImages(prev => [...prev, url]);

          setUploadFeedback('Imagem enviada com sucesso!');
        } else {
          throw new Error('Falha no upload via Cloudinary');
        }
      } else {
        // Fallback: Storage / Base64 Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const url = reader.result as string;
          if (targetField === 'banner') setBannerImage(url);
          else if (targetField === 'about') setAboutImage(url);
          else setNewProdImages(prev => [...prev, url]);
          setUploadFeedback('Imagem carregada com sucesso!');
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error("Erro no envio de imagem:", err);
      setUploadFeedback(`Erro no envio: ${err.message}`);
      addToast('Erro no Upload', 'Não foi possível enviar a imagem. Tente novamente.', 'error');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadFeedback(''), 4000);
    }
  };

  // Guarda de Segurança: Exige login administrativo se o usuário não for gestor
  if (!currentUser || currentUser.role !== 'admin') {
    return <AuthScreen mode="admin" />;
  }

  // Calculate Overview Stats
  const totalRevenue = orders.reduce((sum, order) => sum + (order.status !== 'Cancelado' ? order.total : 0), 0);
  const totalProductsCount = products.length;
  const outOfStockCount = products.filter(p => p.stockControl && p.stock === 0).length;

  return (

    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 font-sans ${
      isDark ? 'bg-[#0B0F19] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* SIDEBAR NAVIGATION (Modern SaaS CMS Style) */}
      <aside className={`w-full md:w-72 shrink-0 border-r border-b md:border-b-0 backdrop-blur-2xl flex flex-col justify-between z-30 transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="p-5 space-y-6">
          
          {/* Logo & Store Return Link */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/40">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-lg">
                EC
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight leading-none">EVIDÊNCIA CMS</h1>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Painel Gestor</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentView('home')}
              className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="Ir para a loja"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-6">
            
            {/* GROUP 1: DASHBOARD & OPERAÇÃO */}
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3">DASHBOARD & VENDAS</span>
              
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart className="h-4 w-4" />
                <span>Visão Geral & Métricas</span>
              </button>

              <button
                onClick={() => setActiveTab('sales')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'sales'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Vendas & Pedidos</span>
                </div>
                {orders.length > 0 && (
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('crediario')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'crediario'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-4 w-4 text-amber-400" />
                  <span>Análise de Crediário</span>
                </div>
                {users.filter(u => u.crediarioStatus === 'EmAnalise').length > 0 && (
                  <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                    {users.filter(u => u.crediarioStatus === 'EmAnalise').length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'customers'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Base de Clientes</span>
              </button>
            </div>

            {/* GROUP 2: CATÁLOGO DE PRODUTOS */}
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3">CATÁLOGO & ESTOQUE</span>
              
              <button
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'inventory'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Gestão de Estoque</span>
              </button>

              <button
                onClick={() => setActiveTab('new-product')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'new-product'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Produto</span>
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'categories'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Categorias da Loja</span>
              </button>

              <button
                onClick={() => setActiveTab('moblink')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'moblink'
                    ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Integrador MobLink ERP</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>

            {/* GROUP 3: GESTOR DE CONTEÚDO (CMS DA LOJA - APENAS ADMIN) */}
            {isAdmin && (
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase px-3 flex items-center space-x-1">
                  <Sparkles className="h-3 w-3" />
                  <span>CMS & VITRINE</span>
                </span>

                <button
                  onClick={() => setActiveTab('banners')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'banners'
                      ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Image className="h-4 w-4" />
                  <span>Banners Principais (Hero)</span>
                </button>

                <button
                  onClick={() => setActiveTab('home-sections')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'home-sections'
                      ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  <span>Ordem das Seções</span>
                </button>

                <button
                  onClick={() => setActiveTab('about-editor')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'about-editor'
                      ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Editor "Sobre Nós"</span>
                </button>

                <button
                  onClick={() => setActiveTab('support-contact')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'support-contact'
                      ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Suporte & Contatos</span>
                </button>
              </div>
            )}

            {/* GROUP 4: CONFIGURAÇÕES & SEGURANÇA (APENAS ADMIN) */}
            {isAdmin && (
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase px-3">SISTEMA</span>
                
                <button
                  onClick={() => setActiveTab('team')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'team'
                      ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span>Gestão de Equipe & Colaboradores</span>
                </button>


                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? isDark ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-slate-900 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Configurações Gerais</span>
                </button>
              </div>
            )}

          </nav>
        </div>

        {/* User Info & Admin Logout Button */}
        <div className="p-4 border-t border-slate-800/40">
          {activeAdminUser && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 px-1 truncate">
                <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs shrink-0 ${
                  isAdmin ? 'bg-amber-400 text-slate-950' : 'bg-sky-400 text-slate-950'
                }`}>
                  {activeAdminUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-bold truncate">{activeAdminUser.name}</p>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                    isAdmin ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' : 'bg-sky-400/20 text-sky-400 border border-sky-400/30'
                  }`}>
                    {isAdmin ? 'Administrador' : 'Vendedor'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logoutAdmin();
                  setCurrentView('home');
                }}
                className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer shrink-0"
                title="Encerrar Sessão da Gestão"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        
        {/* Global CMS Notification Banner */}
        {cmsFeedback && (
          <div className="p-4 rounded-2xl bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-between shadow-lg animate-bounce">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{cmsFeedback}</span>
            </div>
            <button onClick={() => setCmsFeedback('')} className="text-slate-950 hover:opacity-75">✕</button>
          </div>
        )}

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Visão Geral do E-commerce</h2>
                <p className="text-xs text-slate-400">Resumo de desempenho, inventário e pedidos</p>
              </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-amber-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Faturamento Total</span>
                  <DollarSign className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                <p className="text-[11px] text-slate-400">Baseado em {orders.length} pedido(s)</p>
              </div>

              <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total de Produtos</span>
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">{totalProductsCount}</p>
                <p className="text-[11px] text-slate-400">Cadastrados no catálogo</p>
              </div>

              <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-rose-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Fora de Estoque</span>
                  <AlertCircle className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">{outOfStockCount}</p>
                <p className="text-[11px] text-slate-400">Itens com 0 unidades</p>
              </div>

              <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-blue-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Banners Ativos</span>
                  <Image className="h-5 w-5" />
                </div>
                <p className="text-2xl font-black">{(heroBanners || []).filter(b => b.active).length}</p>
                <p className="text-[11px] text-slate-400">Carrossel Hero Principal</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VENDAS & PEDIDOS DOS CLIENTES */}
        {activeTab === 'sales' && (() => {
          const sellersList = Array.from(
            new Set([
              ...users.filter(u => (u.role === 'admin' || u.role === 'seller' || u.isAuthorizedCollaborator) && u.isSeller !== false).map(u => u.name),
              ...orders.map(o => o.sellerName).filter((s): s is string => Boolean(s && s.trim()))
            ])
          ).filter(Boolean);


          return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <ShoppingBag className="h-6 w-6 text-amber-400" />
                  <span>Gestão Global de Vendas & Pedidos ({orders.length})</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Visão completa de todos os pedidos da loja. Altere status de entrega, confirme pagamentos e gerencie fretes.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={ordersSearch}
                    onChange={(e) => setOrdersSearch(e.target.value)}
                    placeholder="Buscar cliente, e-mail, tel ou nº..."
                    className={`pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none w-56 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Entrega:</span>
                  <select
                    value={ordersStatusFilter}
                    onChange={(e) => setOrdersStatusFilter(e.target.value as any)}
                    className={`p-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Todos">Todas Entregas</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="Entregue">Entregue</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Pagamento:</span>
                  <select
                    value={ordersPaymentFilter}
                    onChange={(e) => setOrdersPaymentFilter(e.target.value as any)}
                    className={`p-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Todos">Todos Pagamentos</option>
                    <option value="Pendente">⏳ Pendente</option>
                    <option value="Em Análise">🔍 Em Análise</option>
                    <option value="Confirmado">✅ Confirmado</option>
                    <option value="Recusado">❌ Recusado</option>
                  </select>
                </div>

                {/* FILTRO DE VENDEDOR */}
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Vendedor:</span>
                  <select
                    value={ordersSellerFilter}
                    onChange={(e) => setOrdersSellerFilter(e.target.value)}
                    className={`p-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                      isDark ? 'bg-slate-900 border-slate-800 text-amber-400 font-extrabold' : 'bg-white border-slate-300 text-slate-900 font-bold'
                    }`}
                  >
                    <option value="Todos">Todos Vendedores</option>
                    {sellersList.map((sellerName) => (
                      <option key={sellerName} value={sellerName}>
                        👤 {sellerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Sales Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-black text-slate-400 block">Total de Pedidos</span>
                <span className="text-xl font-black text-white">{orders.length}</span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-black text-slate-400 block">Pedidos Entregues</span>
                <span className="text-xl font-black text-emerald-400">
                  {orders.filter(o => o.status === 'Entregue').length}
                </span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-black text-slate-400 block">Pagamentos Confirmados</span>
                <span className="text-xl font-black text-sky-400">
                  {orders.filter(o => o.paymentStatus === 'Confirmado').length}
                </span>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-black text-slate-400 block">Total Faturado</span>
                <span className="text-xl font-black text-amber-400">
                  R$ {orders
                    .filter(o => o.paymentStatus === 'Confirmado' || o.status === 'Entregue')
                    .reduce((sum, o) => sum + o.total, 0)
                    .toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Seller Filter Highlight Notification */}
            {ordersSellerFilter !== 'Todos' && (
              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-between text-xs font-bold shadow-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-amber-400" />
                  <span>Filtrando Vendas Atribuídas a <strong>{ordersSellerFilter}</strong></span>
                </div>
                <span>
                  {orders.filter(o => o.sellerName === ordersSellerFilter).length} pedido(s) (R$ {orders.filter(o => o.sellerName === ordersSellerFilter).reduce((sum, o) => sum + o.total, 0).toFixed(2).replace('.', ',')})
                </span>
              </div>
            )}

            {/* List of Orders */}
            {orders.length === 0 ? (
              <div className={`p-8 rounded-3xl border text-center space-y-2 ${
                isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                <ShoppingBag className="h-8 w-8 text-amber-400 mx-auto opacity-70" />
                <p className="text-xs font-bold">Nenhum pedido cadastrado no Firestore ainda.</p>
                <p className="text-[11px] opacity-75">Os pedidos gerados pelos clientes aparecerão aqui com todos os detalhes de envio e pagamento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders
                  .filter(o => {
                    const matchSearch = !ordersSearch || 
                      o.customerName.toLowerCase().includes(ordersSearch.toLowerCase()) || 
                      o.customerEmail.toLowerCase().includes(ordersSearch.toLowerCase()) ||
                      (o.customerPhone && o.customerPhone.includes(ordersSearch)) ||
                      (o.orderNumber && o.orderNumber.toLowerCase().includes(ordersSearch.toLowerCase())) ||
                      o.id.toLowerCase().includes(ordersSearch.toLowerCase());
                    const matchStatus = ordersStatusFilter === 'Todos' || o.status === ordersStatusFilter;
                    const matchPayment = ordersPaymentFilter === 'Todos' || (o.paymentStatus || 'Pendente') === ordersPaymentFilter;
                    const matchSeller = ordersSellerFilter === 'Todos' || 
                      (o.sellerName && o.sellerName.toLowerCase().includes(ordersSellerFilter.toLowerCase())) ||
                      (o.sellerEmail && o.sellerEmail.toLowerCase().includes(ordersSellerFilter.toLowerCase()));

                    return matchSearch && matchStatus && matchPayment && matchSeller;
                  })

                  .map((o) => {
                    const isOtherCities = o.deliveryType === 'Entrega para Outras Cidades';
                    const hasPendingFreight = isOtherCities && (o.freightCost === undefined || o.freightCost === 0);

                    return (
                      <div
                        key={o.id}
                        className={`p-6 rounded-3xl border backdrop-blur-xl space-y-4 transition-all shadow-md ${
                          isDark ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-800/50">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono text-sm font-black text-amber-400">{o.orderNumber || o.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              o.status === 'Confirmado' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              o.status === 'Entregue' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              o.status === 'Cancelado' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                            }`}>
                              {o.status}
                            </span>
                            {o.sellerName && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>Vendedor: {o.sellerName}</span>
                              </span>
                            )}
                          </div>


                          <div className="flex flex-wrap items-center space-x-4 text-xs font-semibold gap-2">
                            <span className="text-slate-400">Data: {new Date(o.createdAt).toLocaleDateString('pt-BR')}</span>
                            
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Pagamento:</span>
                              <select
                                value={o.paymentStatus || 'Pendente'}
                                onChange={(e) => {
                                  updateOrderPaymentStatus(o.id, e.target.value as PaymentStatus);
                                  addToast('Pagamento Atualizado!', `O status do pagamento do pedido ${o.orderNumber || o.id} foi alterado para ${e.target.value}.`, 'success');
                                }}
                                className={`p-1.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                                  o.paymentStatus === 'Confirmado' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                                  o.paymentStatus === 'Em Análise' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' :
                                  o.paymentStatus === 'Recusado' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                                  'bg-amber-400/20 text-amber-400 border-amber-400/40'
                                }`}
                              >
                                <option value="Pendente">⏳ Pendente</option>
                                <option value="Em Análise">🔍 Em Análise</option>
                                <option value="Confirmado">✅ Confirmado</option>
                                <option value="Recusado">❌ Recusado</option>
                              </select>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Entrega:</span>
                              <select
                                value={o.status}
                                onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                                className={`p-1.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                                  isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                                }`}
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Confirmado">Confirmado</option>
                                <option value="Entregue">Entregue</option>
                                <option value="Cancelado">Cancelado</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Customer, Payment & Shipping Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Cliente & Contato</span>
                            <p className="font-bold text-sm text-slate-200 mt-0.5">{o.customerName}</p>
                            <p className="text-slate-400">{o.customerEmail}</p>
                            <p className="text-amber-400 font-mono mt-0.5">{o.customerPhone || 'Telefone não informado'}</p>
                          </div>

                          {/* Payment Method & Admin Action */}
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Forma de Pagamento</span>
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-slate-200">{o.paymentMethod || 'Pix'}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  o.paymentStatus === 'Confirmado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  o.paymentStatus === 'Em Análise' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                  o.paymentStatus === 'Recusado' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                  'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                                }`}>
                                  {o.paymentStatus || 'Pendente'}
                                </span>
                              </div>
                              {o.installments && o.installments > 1 && (
                                <p className="text-sky-400 font-bold text-[11px]">
                                  Parcelado em {o.installments}x sem juros
                                </p>
                              )}
                              {o.paymentMethod === 'Crediário da Loja' && (
                                <p className="text-amber-400 font-bold text-[11px]">
                                  Carnê Crediário Evidência em até 6x
                                </p>
                              )}
                              {o.paymentStatus !== 'Confirmado' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await updateOrderPaymentStatus(o.id, 'Confirmado');
                                    addToast('Pagamento Confirmado!', `O pagamento do pedido ${o.orderNumber || o.id} foi confirmado com sucesso.`, 'success');
                                  }}
                                  className="mt-1.5 px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Confirmar Pagamento</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Modalidade de Envio</span>
                            <div className="mt-1 space-y-1">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isOtherCities 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}>
                                {o.deliveryType || 'Entrega em Caxias-MA'}
                              </span>
                              <p className="text-slate-300 text-[11px] font-medium leading-snug">
                                {o.deliveryAddress || 'Endereço não especificado'}
                              </p>
                            </div>
                          </div>

                          {/* Column 4: Freight Management (Conditional) & Price Breakdown */}
                          <div className={`p-3.5 rounded-2xl border space-y-3 ${
                            isOtherCities && hasPendingFreight 
                              ? 'bg-amber-400/10 border-amber-400/30' 
                              : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between border-b pb-1.5 border-slate-800/40">
                              <span className="text-[10px] uppercase font-black text-amber-400">
                                {isOtherCities ? 'Gestão do Valor do Frete' : 'Regra de Envio Aplicada'}
                              </span>
                              {isOtherCities ? (
                                hasPendingFreight ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400/20 text-amber-400 border border-amber-400/30 animate-pulse">
                                    A Combinar
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Definido
                                  </span>
                                )
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                  Automático
                                </span>
                              )}
                            </div>

                            {/* Conditional Freight Controls */}
                            {isOtherCities ? (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-slate-400 font-medium">Insira o valor negociado via WhatsApp:</p>
                                <div className="flex items-center space-x-2">
                                  <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editingFreightMap[o.id] !== undefined ? editingFreightMap[o.id] : (o.freightCost || 0)}
                                      onChange={(e) => setEditingFreightMap(prev => ({ ...prev, [o.id]: e.target.value }))}
                                      placeholder="0,00"
                                      className={`w-full pl-8 pr-2 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                      }`}
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const val = parseFloat(editingFreightMap[o.id] ?? String(o.freightCost || 0));
                                      await updateOrderFreight(o.id, isNaN(val) ? 0 : val);
                                      addToast('Frete Atualizado!', `O valor do frete do pedido ${o.orderNumber || o.id} foi salvo com sucesso.`, 'success');
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-sm cursor-pointer flex items-center space-x-1 shrink-0"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>Salvar</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="py-1">
                                {o.deliveryType === 'Retirada na Loja' ? (
                                  <p className="text-[11px] font-bold text-sky-400 flex items-center space-x-1">
                                    <span>🏬 Retirada na Loja (Frete Grátis)</span>
                                  </p>
                                ) : (
                                  <p className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                                    {((o.subtotal || o.total) > 100 || o.freightCost === 0) ? (
                                      <span>✓ Frete Grátis Caxias - MA (Compras &gt; R$ 100)</span>
                                    ) : (
                                      <span>🚚 Taxa Fixo Caxias - MA: R$ 10,00</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Transparent Price Composition */}
                            <div className="pt-2 border-t border-slate-800/50 space-y-1 text-[11px]">
                              <div className="flex justify-between text-slate-400">
                                <span>Subtotal Produtos:</span>
                                <span className="font-bold text-slate-300">R$ ${(o.subtotal || (o.total - (o.freightCost || 0))).toFixed(2).replace('.', ',')}</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Taxa de Frete:</span>
                                <span className="font-bold text-slate-300">
                                  {isOtherCities 
                                    ? (o.freightCost && o.freightCost > 0 ? `R$ ${o.freightCost.toFixed(2).replace('.', ',')}` : 'A Combinar')
                                    : (o.freightCost === 0 || o.deliveryType === 'Retirada na Loja' || (o.subtotal || 0) > 100 ? 'GRÁTIS' : `R$ ${(o.freightCost || 10).toFixed(2).replace('.', ',')}`)}
                                </span>
                              </div>
                              <div className="flex justify-between font-black text-amber-400 pt-1 border-t border-slate-800/40 text-xs">
                                <span>Total Geral:</span>
                                <span>R$ {o.total.toFixed(2).replace('.', ',')}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Order Items Table */}
                        <div className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                          isDark ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Itens Adquiridos:</span>
                          <div className="divide-y divide-slate-800/40">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="py-1.5 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <img src={item.image} alt={item.name} className="w-7 h-7 object-cover rounded-lg border border-slate-800" />
                                  <span className="font-semibold text-slate-200">{item.name}</span>
                                  <span className="text-[10px] text-slate-400">(Tam: {item.selectedSize || 'Único'})</span>
                                </div>
                                <span className="font-bold">x{item.quantity} - R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          );
        })()}


        {/* TAB: ANÁLISE DE CREDIÁRIO */}
        {activeTab === 'crediario' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <UserCheck className="h-6 w-6 text-amber-400" />
                  <span>Análise & Aprovação de Crediário Próprio</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Avalie cadastros complementares de clientes de Caxias (MA) e defina a liberação de compras no carnê da loja
                </p>
              </div>

              <button
                onClick={fetchUsers}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                <span>Atualizar Solicitações</span>
              </button>
            </div>

            {/* Pending Requests Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Solicitações Pendentes ({users.filter(u => u.crediarioStatus === 'EmAnalise').length})</span>
              </h3>

              {users.filter(u => u.crediarioStatus === 'EmAnalise').length === 0 ? (
                <div className={`p-8 rounded-3xl border text-center space-y-2 ${
                  isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-70" />
                  <p className="text-xs font-bold">Nenhuma solicitação de crediário aguardando análise no momento.</p>
                  <p className="text-[11px] opacity-75">Novas solicitações enviadas pelos clientes aparecerão automaticamente nesta fila.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {users.filter(u => u.crediarioStatus === 'EmAnalise').map((u) => (
                    <div 
                      key={u.uid}
                      className={`p-6 sm:p-7 rounded-3xl border backdrop-blur-xl space-y-5 transition-all shadow-md ${
                        isDark ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      {/* Header row: Customer name, email, submission time, badge */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4 border-slate-800/60">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-black tracking-tight">{u.name}</h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                              Cliente Cadastrado
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {u.crediarioSolicitadoEm && (
                            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block">
                              Solicitado em: {new Date(u.crediarioSolicitadoEm).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-400/20 text-amber-400 border border-amber-400/40 animate-pulse">
                            Aguardando Análise
                          </span>
                        </div>
                      </div>

                      {/* Organized Grid of Fields: 3 Columns on desktop */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        
                        {/* Column 1: Documentos & Filiação */}
                        <div className={`p-4 rounded-2xl border space-y-3 ${
                          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                        }`}>
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-amber-400 border-b pb-1.5 border-slate-800/60 flex items-center space-x-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Documentos & Filiação</span>
                          </h5>

                          <div className="space-y-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">CPF</span>
                              <span className="font-mono font-bold text-slate-200">{u.cpf || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">RG / Identidade</span>
                              <span className="font-mono text-slate-200">{u.rg || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Data de Nascimento</span>
                              <span className="text-slate-200 font-medium">{u.dataNascimento || 'Não informada'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Naturalidade</span>
                              <span className="text-slate-200 font-medium">{u.naturalidade || 'Caxias/MA'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Nome da Mãe</span>
                              <span className="text-slate-200 font-medium">{u.nomeMae || 'Não informado'}</span>
                            </div>
                            {u.nomePai && (
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Nome do Pai</span>
                                <span className="text-slate-200 font-medium">{u.nomePai}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Ocupação, Renda & Contatos */}
                        <div className={`p-4 rounded-2xl border space-y-3 ${
                          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                        }`}>
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-amber-400 border-b pb-1.5 border-slate-800/60 flex items-center space-x-1.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>Profissão, Renda & Contato</span>
                          </h5>

                          <div className="space-y-2">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Profissão / Ocupação</span>
                              <span className="text-slate-200 font-bold">{u.profissao || 'Não informada'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Renda Mensal Declarada</span>
                              <span className="text-emerald-400 font-extrabold">{u.rendaMensal || 'Não informada'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Telefone / WhatsApp</span>
                              <span className="text-slate-200 font-bold">{u.telefone || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Referência Pessoal / Emergência</span>
                              <span className="text-slate-200 font-medium">{u.referenciaPessoal || 'Não informada'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Column 3: Endereço Residencial Completo */}
                        <div className={`p-4 rounded-2xl border space-y-3 ${
                          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
                        }`}>
                          <h5 className="text-[10px] font-black uppercase tracking-wider text-amber-400 border-b pb-1.5 border-slate-800/60 flex items-center space-x-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>Endereço Residencial (Caxias-MA)</span>
                          </h5>

                          <div className="space-y-2">
                            {u.cep && (
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">CEP</span>
                                <span className="font-mono text-slate-200">{u.cep}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-bold">Logradouro / Bairro</span>
                              <p className="text-slate-200 font-medium text-[11px] leading-relaxed mt-0.5">
                                {u.endereco || 'Endereço não cadastrado'}
                              </p>
                            </div>
                            {u.pontoReferencia && (
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Ponto de Referência</span>
                                <span className="text-slate-300 font-medium italic">{u.pontoReferencia}</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => handleRejeitarCrediario(u)}
                          className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all cursor-pointer"
                        >
                          Rejeitar Crediário
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAprovarCrediario(u)}
                          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                        >
                          <Check className="h-4 w-4" />
                          <span>Aprovar Crediário</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historic Customers Table */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                Histórico Geral de Cadastros ({users.length})
              </h3>

              <div className={`rounded-3xl border backdrop-blur-xl overflow-hidden ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                        isDark ? 'border-slate-800 bg-slate-950/50 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                      }`}>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">CPF / Documento</th>
                        <th className="p-4">Telefone</th>
                        <th className="p-4">Status do Crediário</th>
                        <th className="p-4 text-right">Ação de Gestão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-semibold">
                      {users.map((user) => (
                        <tr key={user.uid} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-4">
                            <p className="font-bold">{user.name}</p>
                            <p className="text-[10px] text-slate-400">{user.email}</p>
                          </td>
                          <td className="p-4 font-mono text-[11px]">{user.cpf || '—'}</td>
                          <td className="p-4">{user.telefone || '—'}</td>
                          <td className="p-4">
                            {user.crediarioStatus === 'Aprovado' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Aprovado
                              </span>
                            ) : user.crediarioStatus === 'EmAnalise' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-400/20 text-amber-400 border border-amber-400/30">
                                Em Análise
                              </span>
                            ) : user.crediarioStatus === 'Rejeitado' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Rejeitado
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                                Não Solicitado
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {user.crediarioStatus !== 'Aprovado' && (
                              <button
                                onClick={() => handleAprovarCrediario(user)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-bold cursor-pointer transition-colors"
                              >
                                Aprovar
                              </button>
                            )}
                            {user.crediarioStatus !== 'Rejeitado' && (
                              <button
                                onClick={() => handleRejeitarCrediario(user)}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[11px] font-bold cursor-pointer transition-colors"
                              >
                                Rejeitar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BASE DE CLIENTES & CRM */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Header & Main Controls */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <Users className="h-6 w-6 text-amber-400" />
                  <span>Base de Clientes & CRM ({users.length})</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Gerencie cadastros completos/incompletos, consulte aniversariantes, intenções de compra e conceda cashback.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    placeholder="Buscar nome, e-mail, tel, CPF..."
                    className={`pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none w-56 ${
                      isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Status Cadastro Filter */}
                <select
                  value={registrationFilter}
                  onChange={(e) => setRegistrationFilter(e.target.value as any)}
                  className={`p-1.5 rounded-xl text-xs font-bold border focus:outline-none cursor-pointer ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Todos">Todos os Cadastros</option>
                  <option value="Completo">✓ Cadastro Completo</option>
                  <option value="Incompleto">⚠️ Cadastro Incompleto</option>
                </select>

                <button
                  onClick={fetchUsers}
                  className="p-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                  <span>Atualizar</span>
                </button>
              </div>
            </div>

            {/* Birthday Filter Pills */}
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-400 flex items-center space-x-1.5">
                  <Cake className="h-4 w-4 text-purple-400" />
                  <span>Filtros de Aniversariantes para Campanhas</span>
                </span>
                <span className="text-[10px] text-slate-400">Identifique clientes com aniversário para enviar ofertas especiais</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'Todos', label: '🎉 Todos os Clientes', count: users.length },
                  { id: 'Dia', label: '🎂 Aniversariantes do Dia', count: users.filter(u => isBirthdayMatch(u.dataNascimento || (u as any).birthDate || (u as any).nascimento, 'Dia')).length },
                  { id: 'Semana', label: '📅 Aniversariantes da Semana', count: users.filter(u => isBirthdayMatch(u.dataNascimento || (u as any).birthDate || (u as any).nascimento, 'Semana')).length },
                  { id: 'Mês', label: '📆 Aniversariantes do Mês', count: users.filter(u => isBirthdayMatch(u.dataNascimento || (u as any).birthDate || (u as any).nascimento, 'Mês')).length }
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setBirthdayFilter(pill.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 border ${
                      birthdayFilter === pill.id
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                        : isDark ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300">
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Customers Grid */}
            <div className="space-y-4">
              {users
                .filter(u => {
                  const anyU = u as any;
                  const phoneVal = u.telefone || anyU.phone || anyU.whatsapp || anyU.celular || '';
                  const docVal = u.cpf || anyU.documento || u.rg || '';
                  const bdayVal = u.dataNascimento || anyU.birthDate || anyU.nascimento || anyU.data_nascimento || '';

                  const matchSearch = !usersSearch || 
                    u.name.toLowerCase().includes(usersSearch.toLowerCase()) || 
                    u.email.toLowerCase().includes(usersSearch.toLowerCase()) ||
                    phoneVal.includes(usersSearch) ||
                    docVal.includes(usersSearch);
                  
                  const isComplete = checkIsProfileComplete(u);
                  const matchReg = registrationFilter === 'Todos' || 
                    (registrationFilter === 'Completo' && isComplete) || 
                    (registrationFilter === 'Incompleto' && !isComplete);

                  const matchBday = birthdayFilter === 'Todos' || isBirthdayMatch(bdayVal, birthdayFilter);

                  return matchSearch && matchReg && matchBday;
                })
                .map((u) => {
                  const anyU = u as any;
                  const phoneVal = u.telefone || anyU.phone || anyU.whatsapp || anyU.celular;
                  const cpfVal = u.cpf || anyU.documento || u.rg;
                  const bdayVal = u.dataNascimento || anyU.birthDate || anyU.nascimento || anyU.data_nascimento;
                  const addressVal = u.endereco || anyU.address;

                  const isComplete = checkIsProfileComplete(u);
                  const isDayBday = isBirthdayMatch(bdayVal, 'Dia');
                  const isWeekBday = isBirthdayMatch(bdayVal, 'Semana');
                  const isMonthBday = isBirthdayMatch(bdayVal, 'Mês');

                  const defaultDate30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const currentCbInput = editingCashbackMap[u.uid] || {
                    balance: String(u.cashbackBalance || 0),
                    validUntil: u.cashbackValidUntil || defaultDate30Days
                  };

                  return (
                    <div
                      key={u.uid}
                      className={`p-6 rounded-3xl border backdrop-blur-xl space-y-4 transition-all shadow-md ${
                        isDark ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      {/* Customer Row Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-800/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 font-black text-sm flex items-center justify-center">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-black text-sm text-slate-100">{u.name}</h3>
                              
                              {/* Registration Status Badge */}
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                isComplete 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-amber-400/20 text-amber-400 border-amber-400/30 animate-pulse'
                              }`}>
                                {isComplete ? '✓ Cadastro Completo' : '⚠️ Cadastro Incompleto'}
                              </span>

                              {/* Birthday Tag */}
                              {isDayBday ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-bounce">
                                  🎂 Aniversariante HOJE!
                                </span>
                              ) : isWeekBday ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  📅 Aniversariante da Semana
                                </span>
                              ) : isMonthBday ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                  📆 Aniversariante do Mês
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>

                        {/* Intent Tags & Actions */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* Cart Intent Tag */}
                          {(() => {
                            const activeCartCount = u.cartItemsCount ?? (u.cartItems ? u.cartItems.reduce((acc, i) => acc + i.quantity, 0) : 0);
                            const hasCart = activeCartCount > 0;
                            return (
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center space-x-1 ${
                                hasCart
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse'
                                  : 'bg-slate-800/40 text-slate-400 border-slate-700/50'
                              }`}>
                                <ShoppingCart className="h-3 w-3" />
                                <span>{hasCart ? `Carrinho Ativo (${activeCartCount} itens)` : 'Carrinho Vazio'}</span>
                              </span>
                            );
                          })()}

                          {/* Favorite Intent Tag */}
                          {(() => {
                            const activeFavCount = u.favoriteItemsCount ?? (u.favoriteIds ? u.favoriteIds.length : 0);
                            const hasFav = activeFavCount > 0;
                            return (
                              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center space-x-1 ${
                                hasFav
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : 'bg-slate-800/40 text-slate-400 border-slate-700/50'
                              }`}>
                                <Heart className="h-3 w-3" />
                                <span>{hasFav ? `Favoritos (${activeFavCount})` : 'Sem Favoritos'}</span>
                              </span>
                            );
                          })()}

                          {/* Crediario Badge */}
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold border bg-slate-800 text-slate-300 border-slate-700">
                            Crediário: {u.crediarioStatus || 'Não Solicitado'}
                          </span>
                        </div>
                      </div>

                      {/* Customer Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        {/* Col 1: Contato & Documentos */}
                        <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                          isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-[10px] uppercase font-black text-amber-400 block">Dados de Contato</span>
                          <p className="text-slate-300"><strong>Telefone/WhatsApp:</strong> {phoneVal || 'Não informado'}</p>
                          <p className="text-slate-300 font-mono"><strong>CPF/Doc:</strong> {cpfVal || 'Não informado'}</p>
                          <p className="text-slate-300"><strong>Data Nasc:</strong> {bdayVal || 'Não informada'}</p>
                        </div>

                        {/* Col 2: Endereço */}
                        <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                          isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-[10px] uppercase font-black text-amber-400 block">Endereço Cadastrado</span>
                          <p className="text-slate-300 leading-snug">
                            {addressVal ? (
                              addressVal.includes(',') ? addressVal : `${addressVal}${u.numero ? ', Nº ' + u.numero : ''}${u.bairro ? ' - ' + u.bairro : ''}${u.cidade ? ', ' + u.cidade : ''}${u.uf ? '/' + u.uf : ''}`
                            ) : 'Endereço não preenchido'}
                          </p>
                        </div>


                        {/* Col 3: Gestão de Cashback */}
                        <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                          (u.cashbackBalance && u.cashbackBalance > 0)
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-black text-emerald-400 flex items-center space-x-1">
                              <Gift className="h-3.5 w-3.5" />
                              <span>Gestão de Cashback</span>
                            </span>
                            {u.cashbackBalance && u.cashbackBalance > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Ativo: R$ {u.cashbackBalance.toFixed(2).replace('.', ',')}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={currentCbInput.balance}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditingCashbackMap(prev => ({
                                    ...prev,
                                    [u.uid]: { ...currentCbInput, balance: val }
                                  }));
                                }}
                                placeholder="Saldo"
                                className={`w-full pl-8 pr-2 py-1 rounded-xl text-xs font-bold border focus:outline-none ${
                                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                            </div>

                            <input
                              type="date"
                              value={currentCbInput.validUntil}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingCashbackMap(prev => ({
                                  ...prev,
                                  [u.uid]: { ...currentCbInput, validUntil: val }
                                }));
                              }}
                              className={`py-1 px-2 rounded-xl text-xs font-bold border focus:outline-none ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />

                            <button
                              type="button"
                              onClick={async () => {
                                const val = parseFloat(currentCbInput.balance);
                                const amount = isNaN(val) ? 0 : val;
                                await updateUserCashback(u.uid, amount, currentCbInput.validUntil);
                                addToast('Cashback Atualizado!', `Saldo de R$ ${amount.toFixed(2).replace('.', ',')} salvo para ${u.name}.`, 'success');
                              }}
                              className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-sm cursor-pointer flex items-center space-x-1 shrink-0"
                            >
                              <Save className="h-3.5 w-3.5" />
                              <span>Salvar</span>
                            </button>
                          </div>

                          {u.cashbackValidUntil && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              Válido até: <span className="text-emerald-400 font-bold">{new Date(u.cashbackValidUntil + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB: GESTÃO DE EQUIPE & SEGURANÇA */}

        {activeTab === 'team' && (
          isAdmin ? (
            <TeamManagement
              users={users}
              currentAdminUser={activeAdminUser}
              isDark={isDark}
              onRefreshUsers={fetchUsers}
              addToast={addToast}
            />
          ) : (
            <div className="p-10 text-center space-y-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 max-w-lg mx-auto my-12 backdrop-blur-xl">
              <Shield className="h-12 w-12 text-amber-500 mx-auto" />
              <h3 className="text-xl font-black">Acesso Restrito ao Administrador</h3>
              <p className="text-xs text-slate-400">Esta área de Gestão de Equipe & Permissões é de acesso exclusivo para administradores da loja.</p>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Voltar ao Dashboard</span>
              </button>
            </div>
          )
        )}


        {/* TAB 2: GERENCIADOR DE BANNERS HERO (NEW CMS FEATURE) */}

        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <Image className="h-6 w-6 text-amber-400" />
                  <span>Gerenciador de Banners (Hero)</span>
                </h2>
                <p className="text-xs text-slate-400">Adicione, edite, ordene e ative os banners do carrossel principal da home</p>
              </div>

              <button
                onClick={handleOpenAddBanner}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Novo Banner</span>
              </button>
            </div>

            {/* List of Banners */}
            <div className="grid grid-cols-1 gap-6">
              {(heroBanners || []).map((banner, index) => (
                <div 
                  key={banner.id}
                  className={`p-6 rounded-3xl border backdrop-blur-xl flex flex-col md:flex-row items-center gap-6 transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  } ${!banner.active ? 'opacity-50 grayscale' : ''}`}
                >
                  {/* Banner Image Preview */}
                  <div className="w-full md:w-64 h-36 rounded-2xl overflow-hidden relative shrink-0 border border-slate-800">
                    <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-slate-950/80 text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-400/30">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Banner Info */}
                  <div className="flex-1 space-y-2 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 border border-amber-400/30">
                        {banner.badge}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        banner.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {banner.active ? 'Ativo na Home' : 'Inativo'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black">{banner.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{banner.description}</p>
                    
                    <div className="pt-2 text-xs font-semibold text-amber-400 flex items-center space-x-2">
                      <span>CTA: "{banner.buttonText}"</span>
                      <span>•</span>
                      <span>Destino: #{banner.tabKey}</span>
                    </div>
                  </div>

                  {/* Banner Actions */}
                  <div className="flex items-center space-x-2 shrink-0">

                    <button
                      onClick={() => handleToggleBannerActive(banner.id)}
                      className={`p-2.5 rounded-xl border font-bold text-xs cursor-pointer ${
                        banner.active ? 'bg-amber-400/20 text-amber-400 border-amber-400/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={banner.active ? "Desativar" : "Ativar"}
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEditBanner(banner)}
                      className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-amber-400 cursor-pointer"
                      title="Editar Banner"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                      title="Excluir Banner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add / Edit Banner Modal */}
            {isBannerModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black">
                      {editingBanner ? 'Editar Banner Hero' : 'Adicionar Novo Banner Hero'}
                    </h3>
                    <button onClick={() => setIsBannerModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <form onSubmit={handleSaveBanner} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Badge Tag (Texto da Etiqueta)</label>
                      <input
                        type="text"
                        value={bannerBadge}
                        onChange={(e) => setBannerBadge(e.target.value)}
                        placeholder="Ex: NOVA COLEÇÃO 2026"
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Título Principal *</label>
                      <input
                        type="text"
                        value={bannerTitle}
                        onChange={(e) => setBannerTitle(e.target.value)}
                        placeholder="Ex: Elegância que caminha com você."
                        required
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Subtítulo / Descrição</label>
                      <textarea
                        value={bannerDesc}
                        onChange={(e) => setBannerDesc(e.target.value)}
                        placeholder="Descubra a seleção exclusiva de calçados..."
                        rows={3}
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">URL da Imagem do Banner *</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={bannerImage}
                          onChange={(e) => setBannerImage(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          required
                          className={`flex-1 p-3 rounded-xl text-xs border focus:outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                          }`}
                        />
                        <label className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 cursor-pointer hover:bg-slate-700 flex items-center space-x-1">
                          <Upload className="h-4 w-4" />
                          <span>Upload</span>
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} className="hidden" />
                        </label>
                      </div>
                      {bannerImage && (
                        <div className="mt-2 h-28 rounded-xl overflow-hidden border border-slate-800">
                          <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-300">Texto do Botão (CTA)</label>
                        <input
                          type="text"
                          value={bannerBtnText}
                          onChange={(e) => setBannerBtnText(e.target.value)}
                          placeholder="Ex: Ver Lançamentos"
                          className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-300">Link / Aba de Destino</label>
                        <select
                          value={bannerTabKey}
                          onChange={(e) => setBannerTabKey(e.target.value)}
                          className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                          }`}
                        >
                          <option value="lançamentos">Lançamentos</option>
                          <option value="feminino">Feminino</option>
                          <option value="masculino">Masculino</option>
                          <option value="ofertas">Ofertas</option>
                          <option value="sapatos-sociais">Sapatos Sociais</option>
                          <option value="botas">Botas</option>
                          <option value="acessorios">Acessórios</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="bannerActive"
                        checked={bannerActive}
                        onChange={(e) => setBannerActive(e.target.checked)}
                        className="rounded accent-amber-400 w-4 h-4"
                      />
                      <label htmlFor="bannerActive" className="text-xs font-bold text-slate-300">
                        Banner Ativo na Vitrine Principal
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsBannerModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer"
                      >
                        Salvar Banner
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDENAÇÃO DE SEÇÕES DA HOME (NEW CMS FEATURE) */}
        {activeTab === 'home-sections' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <Sliders className="h-6 w-6 text-amber-400" />
                  <span>Ordenação de Seções da Página Inicial</span>
                </h2>
                <p className="text-xs text-slate-400">Altere a ordem de exibição e ative/desative seções da loja dinamicamente com os botões de setas</p>
              </div>

              <button
                type="button"
                onClick={handleSaveHomeSectionsOrder}
                className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 shrink-0"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Ordem das Seções</span>
              </button>
            </div>

            <div className="space-y-4">
              {(homeSections || []).map((sec, index) => (
                <div
                  key={sec.id}
                  className={`p-5 rounded-2xl border backdrop-blur-xl flex items-center justify-between transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  } ${!sec.enabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center space-x-4">
                    <span className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center justify-center font-black text-xs">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-black">{sec.name}</h3>
                      <p className="text-xs text-slate-400">{sec.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleOpenEditSection(sec)}
                      className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-amber-400 cursor-pointer flex items-center space-x-1.5 text-xs font-bold"
                      title="Editar título e subtítulo"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    <button
                      onClick={() => handleMoveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleMoveSection(index, 'down')}
                      disabled={index === (homeSections || []).length - 1}
                      className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>

                    <label className="flex items-center space-x-2 cursor-pointer border border-slate-700 px-3 py-1.5 rounded-xl bg-slate-800">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => handleToggleSectionEnabled(sec.id)}
                        className="rounded accent-amber-400 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-300">
                        {sec.enabled ? 'Exibido' : 'Oculto'}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveHomeSectionsOrder}
                className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Seções e Ordem no Firestore</span>
              </button>
            </div>

            {/* Edit Section Modal */}
            {isSectionModalOpen && editingSection && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black">Editar Seção da Home</h3>
                    <button onClick={() => setIsSectionModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <form onSubmit={handleSaveSectionEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Título da Seção *</label>
                      <input
                        type="text"
                        value={sectionNameInput}
                        onChange={(e) => setSectionNameInput(e.target.value)}
                        placeholder="Ex: Ofertas Relâmpago & Outlet"
                        required
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-300">Subtítulo / Descrição</label>
                      <textarea
                        value={sectionDescInput}
                        onChange={(e) => setSectionDescInput(e.target.value)}
                        placeholder="Ex: Descontos exclusivos por tempo limitado"
                        rows={3}
                        className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                        }`}
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsSectionModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>Salvar Alterações</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EDITOR "SOBRE NÓS" (NEW CMS FEATURE) */}
        {activeTab === 'about-editor' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-amber-400" />
                <span>Editor da Seção "Sobre Nós"</span>
              </h2>
              <p className="text-xs text-slate-400">Atualize os textos, imagens e dados institucionais da marca Evidência Calçados</p>
            </div>

            <form onSubmit={handleSaveAbout} className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl space-y-6 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Etiqueta Badge</label>
                  <input
                    type="text"
                    value={aboutBadge}
                    onChange={(e) => setAboutBadge(e.target.value)}
                    placeholder="Ex: TRADIÇÃO & EXCELÊNCIA"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Título Institucional</label>
                  <input
                    type="text"
                    value={aboutTitle}
                    onChange={(e) => setAboutTitle(e.target.value)}
                    placeholder="Ex: Evidência Calçados"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">Subtítulo / Slogan</label>
                <input
                  type="text"
                  value={aboutSubtitle}
                  onChange={(e) => setAboutSubtitle(e.target.value)}
                  placeholder="Ex: Tradição, Qualidade e Estilo nos Seus Pés"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">Texto Descritivo Completo</label>
                <textarea
                  value={aboutDescription}
                  onChange={(e) => setAboutDescription(e.target.value)}
                  rows={6}
                  placeholder="Escreva a história da empresa..."
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">URL da Imagem de Destaque</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={aboutImage}
                    onChange={(e) => setAboutImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className={`flex-1 p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                  <label className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 cursor-pointer hover:bg-slate-700 flex items-center space-x-1">
                    <Upload className="h-4 w-4" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'about')} className="hidden" />
                  </label>
                </div>
                {aboutImage && (
                  <div className="mt-2 h-36 rounded-xl overflow-hidden border border-slate-800 max-w-sm">
                    <img src={aboutImage} alt="About Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Conteúdo Institucional</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: SUPORTE E CONTATO (NEW CMS FEATURE) */}
        {activeTab === 'support-contact' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                <PhoneCall className="h-6 w-6 text-amber-400" />
                <span>Suporte, Contatos & Barra Promocional</span>
              </h2>
              <p className="text-xs text-slate-400">Gerencie o WhatsApp de atendimento, e-mail, endereço físico e mensagem promocional do topo</p>
            </div>

            <form onSubmit={handleSaveContact} className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl space-y-6 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Número do WhatsApp (com DDD)</label>
                  <input
                    type="text"
                    value={contactWhatsApp}
                    onChange={(e) => setContactWhatsApp(e.target.value)}
                    placeholder="Ex: 5599984684867"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">E-mail de Atendimento</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Ex: contato@evidencia.com.br"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">Endereço Físico Completo</label>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  placeholder="Ex: Rua Afonso Pena, 295 - Centro, Caxias - MA"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-slate-300">Horário de Funcionamento</label>
                <input
                  type="text"
                  value={contactHours}
                  onChange={(e) => setContactHours(e.target.value)}
                  placeholder="Ex: Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 13:00"
                  className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h3 className="text-sm font-black text-amber-400">Barra Promocional no Topo</h3>
                
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-300">Texto do Anúncio Promocional</label>
                  <input
                    type="text"
                    value={promoText}
                    onChange={(e) => setPromoText(e.target.value)}
                    placeholder="Ex: Frete grátis para todo Brasil em compras acima de R$ 350!"
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPromoActive"
                    checked={isPromoActive}
                    onChange={(e) => setIsPromoActive(e.target.checked)}
                    className="rounded accent-amber-400 w-4 h-4"
                  />
                  <label htmlFor="isPromoActive" className="text-xs font-bold text-slate-300">
                    Exibir Barra Promocional no Topo da Loja
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Dados de Contato</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 6: MOBLINK ERP INTEGRATOR */}
        {activeTab === 'moblink' && (
          <MoblinkIntegrationPanel />
        )}

        {/* TAB 7: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <ErrorBoundary fallbackTitle="Gestão de Produtos & Estoque (MobLink ERP)">
            <MoblinkProductsManager />
          </ErrorBoundary>
        )}

        {/* TAB 8: CATEGORIES MANAGER */}
        {activeTab === 'categories' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Categorias da Loja</h2>
              <p className="text-xs text-slate-400">Gerencie subcategorias e taxonomias do e-commerce</p>
            </div>

            <div className={`p-6 rounded-3xl border backdrop-blur-xl space-y-4 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="text-sm font-black">Adicionar Nova Categoria</h3>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria (Ex: Mocassins)"
                  className={`flex-1 p-3 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                  }`}
                />
                <button
                  onClick={() => {
                    if (newCatName) {
                      addCategory({ id: newCatName.toLowerCase().replace(/\s+/g, '-'), name: newCatName });
                      setNewCatName('');
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="font-bold text-sm">{cat.name}</p>
                    <p className="text-[10px] text-slate-400">ID: {cat.id}</p>
                  </div>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: SETTINGS & DANGER ZONE (RESET LAYOUT) */}
        {activeTab === 'settings' && (
          isAdmin ? (
            <div className="space-y-8 max-w-4xl">
              <div>
                <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-amber-400" />
                  <span>Configurações Gerais do E-commerce</span>
                </h2>
                <p className="text-xs text-slate-400">Preferências do sistema, chaves de integração e restauração de fábrica</p>
              </div>

              {/* Cloudinary Integration Settings */}
              <div className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <h3 className="text-sm font-black text-amber-400 flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Integração com Cloudinary (Upload de Imagens)</span>
                </h3>
                <p className="text-xs text-slate-400">Configure suas chaves para armazenar imagens de produtos e banners diretamente na nuvem.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-300">Cloud Name</label>
                    <input
                      type="text"
                      value={cloudinaryCloudName}
                      onChange={(e) => {
                        setCloudinaryCloudName(e.target.value);
                        localStorage.setItem('cloudinary_cloud_name', e.target.value);
                      }}
                      placeholder="Ex: dxy12345"
                      className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-300">Upload Preset (Unsigned)</label>
                    <input
                      type="text"
                      value={cloudinaryUploadPreset}
                      onChange={(e) => {
                        setCloudinaryUploadPreset(e.target.value);
                        localStorage.setItem('cloudinary_upload_preset', e.target.value);
                      }}
                      placeholder="Ex: evidencia_preset"
                      className={`w-full p-3 rounded-xl text-xs border focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* DANGER ZONE: FACTORY RESET */}
              <div className="p-6 sm:p-8 rounded-3xl border border-rose-500/30 bg-rose-950/20 backdrop-blur-xl space-y-4">
                <div className="flex items-center space-x-3 text-rose-500">
                  <AlertCircle className="h-6 w-6 shrink-0 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Zona de Segurança & Restauração</h3>
                    <p className="text-xs text-rose-300/80">Restaure o layout, banners e conteúdos originais entregues de fábrica.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Se alguma alteração de banners, ordem de seções ou textos desconfigurar a vitrine da loja, você pode restaurar todos os padrões estéticos e originais da <strong>Evidência Calçados</strong> a qualquer momento.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRestoreModalOpen(true)}
                    className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Restaurar Layout Original da Loja</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center space-y-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 max-w-lg mx-auto my-12 backdrop-blur-xl">
              <Shield className="h-12 w-12 text-amber-500 mx-auto" />
              <h3 className="text-xl font-black">Acesso Restrito ao Administrador</h3>
              <p className="text-xs text-slate-400">Esta área de Configurações Gerais do Sistema é de acesso exclusivo para administradores da loja.</p>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs hover:bg-amber-300 transition-all shadow-md cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Voltar ao Dashboard</span>
              </button>
            </div>
          )
        )}


      </main>

      {/* CONFIRMATION MODAL FOR FACTORY RESET */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-200 ${
            isDark ? 'bg-slate-900 border-rose-500/40 text-white shadow-black/80' : 'bg-white border-rose-200 text-slate-900'
          }`}>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 mx-auto flex items-center justify-center shadow-lg">
              <AlertCircle className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-rose-500">Restaurar Layout Original?</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Atenção: Tem certeza que deseja restaurar o layout padrão? Todas as suas alterações de banners hero, ordem de seções, textos do "Sobre Nós" e contatos serão desfeitas e substituídas pelas configurações originais de fábrica. Essa ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="flex-1 px-5 py-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={async () => {
                  await restoreDefaultConfig();
                  setIsRestoreModalOpen(false);
                  addToast('Configurações Restauradas!', 'Todas as seções, banners e textos retornaram ao padrão de fábrica no Firestore.', 'info');
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-950/50 cursor-pointer flex items-center justify-center space-x-2 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Sim, Restaurar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO DE NOVO MEMBRO DA EQUIPE (ADMIN / VENDEDOR) */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Cadastrar Usuário da Equipe</h3>
                  <p className="text-[11px] text-slate-400">Pré-cadastro de administradores e vendedores</p>
                </div>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterTeamMemberSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  placeholder="Ex: Carlos Andrade"
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  required
                  value={teamEmailInput}
                  onChange={(e) => setTeamEmailInput(e.target.value)}
                  placeholder="vendedor@evidencia.com"
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Perfil de Acesso (Permissão)
                </label>
                <select
                  value={teamRoleInput}
                  onChange={(e) => setTeamRoleInput(e.target.value as 'admin' | 'seller')}
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                >
                  <option value="seller">Vendedor (Atendimento & Vendas)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                  Senha Temporária
                </label>
                <input
                  type="text"
                  required
                  value={teamTempPassInput}
                  onChange={(e) => setTeamTempPassInput(e.target.value)}
                  placeholder="evidencia2026"
                  className={`w-full px-4 py-2.5 text-xs border rounded-xl font-mono focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-800 text-amber-400 focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-slate-800'
                  }`}
                />
                <p className="text-[10px] text-slate-400 italic">
                  * O usuário será obrigado a redefinir esta senha no primeiro login.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="flex-1 py-3 px-4 text-xs font-bold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all shadow-md cursor-pointer"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION CONTAINER */}

      <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-start space-x-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
              toast.type === 'success' ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/50' :
              toast.type === 'error' ? 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-950/50' :
              'bg-slate-900/95 border-amber-500/50 text-white shadow-amber-950/50'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              toast.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
              'bg-amber-500/20 text-amber-400'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
              {toast.type === 'info' && <Sparkles className="h-5 w-5" />}
            </div>

            <div className="flex-1 space-y-0.5 pt-0.5">
              <h4 className="text-xs font-black tracking-wide">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 font-medium leading-snug">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
