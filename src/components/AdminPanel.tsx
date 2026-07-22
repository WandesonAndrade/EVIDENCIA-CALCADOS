import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Order, OrderStatus, UserProfile, Category } from '../types';
import { MoblinkIntegrationPanel } from './MoblinkIntegrationPanel';
import { MoblinkProductsManager } from './MoblinkProductsManager';
import { storage, db } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { 
  Package, DollarSign, Users, RefreshCw, Plus, 
  Trash2, Edit, Save, ToggleLeft, ToggleRight, 
  Upload, Check, AlertCircle, ShoppingBag, Eye,
  BarChart, Layers, MessageSquare, Search, Filter, 
  Settings, ArrowLeft, UserCheck, EyeOff, ChevronRight, 
  Info, Sliders, Zap, Barcode
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { 
    products, 
    orders, 
    currentUser, 
    setCurrentView,
    addProduct,
    deleteProduct,
    updateProduct,
    updateOrderStatus,
    assignOrderSeller,
    theme,
    toggleTheme,
    categories,
    addCategory,
    deleteCategory,
    updateCategory
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'sales' | 'customers' | 'new-product' | 'moblink-products' | 'settings' | 'categories' | 'moblink'>('overview');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
  const [customAttrLabel, setCustomAttrLabel] = useState('');
  const [customAttrValue, setCustomAttrValue] = useState('');

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
  const [showCloudinaryConfig, setShowCloudinaryConfig] = useState(false);

  // App Settings States
  const [shopWhatsApp, setShopWhatsApp] = useState(() => localStorage.getItem('evidencia_settings_whatsapp') || '5599984684867');
  const [promoBannerText, setPromoBannerText] = useState(() => localStorage.getItem('evidencia_settings_banner_text') || 'Frete grátis para todo Brasil em compras acima de R$ 350!');
  const [isPromoBannerActive, setIsPromoBannerActive] = useState(() => {
    const saved = localStorage.getItem('evidencia_settings_banner_active');
    return saved !== 'false';
  });

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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Users Management States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<'Todos' | 'customer' | 'seller' | 'admin'>('Todos');
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);

  // Inline Quick Stock edit variables
  const [inlineStockValue, setInlineStockValue] = useState<{ [key: string]: number }>({});

  const sizeOptions = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44];

  // Default rich customer fallback accounts for realistic mock presentation if DB lacks entries
  const DEFAULT_CUSTOMERS: UserProfile[] = [
    {
      uid: "user_mariasilva",
      name: "Maria Aparecida da Silva",
      email: "mariasilva@gmail.com",
      role: "customer",
      telefone: "(11) 98765-4321",
      rg: "12.345.678-9",
      cpf: "123.456.789-00",
      nomeMae: "Rita de Cássia da Silva",
      dataNascimento: "1985-04-12",
      naturalidade: "São Paulo - SP",
      endereco: "Avenida Paulista",
      numero: "1000",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
      cep: "01310-100",
      createdAt: "2026-06-15T14:32:00.000Z"
    },
    {
      uid: "user_joaooliveira",
      name: "João Pedro de Oliveira",
      email: "joaopedro@yahoo.com.br",
      role: "customer",
      telefone: "(99) 98122-4467",
      rg: "98.765.432-1",
      cpf: "987.654.321-11",
      nomeMae: "Maria de Lourdes Oliveira",
      dataNascimento: "1992-09-25",
      naturalidade: "Caxias - MA",
      endereco: "Rua das Flores",
      numero: "150",
      bairro: "Centro",
      cidade: "Caxias",
      uf: "MA",
      cep: "65600-000",
      createdAt: "2026-07-02T10:15:00.000Z"
    },
    {
      uid: "user_fernandasantos",
      name: "Fernanda Lima Santos",
      email: "fernandasantos@gmail.com",
      role: "customer",
      telefone: "(99) 99188-7512",
      rg: "45.678.901-2",
      cpf: "456.789.012-22",
      nomeMae: "Zélia Lima Santos",
      dataNascimento: "1994-11-05",
      naturalidade: "São Luís - MA",
      endereco: "Avenida Atlântica",
      numero: "500",
      bairro: "Calhau",
      cidade: "São Luís",
      uf: "MA",
      cep: "65071-380",
      createdAt: "2026-07-20T18:45:00.000Z"
    }
  ];

  // Fetch registered users (Firestore + Local fallback)
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        const fetchedUsers: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });

        // Ensure default rich customer profiles are merged for robust crediário evaluations
        if (fetchedUsers.length > 0) {
          const existingEmails = fetchedUsers.map(u => u.email.toLowerCase().trim());
          const extraDefaults = DEFAULT_CUSTOMERS.filter(def => !existingEmails.includes(def.email.toLowerCase().trim()));
          setUsers([...fetchedUsers, ...extraDefaults]);
        } else {
          const localUsersObj = JSON.parse(localStorage.getItem('evidencia_local_users') || '{}');
          const localUsersList = Object.values(localUsersObj) as UserProfile[];
          if (localUsersList.length > 0) {
            setUsers(localUsersList);
          } else {
            setUsers(DEFAULT_CUSTOMERS);
            const localObj: Record<string, UserProfile> = {};
            DEFAULT_CUSTOMERS.forEach(u => { localObj[u.uid] = u; });
            localStorage.setItem('evidencia_local_users', JSON.stringify(localObj));
          }
        }
      } catch (error) {
        console.warn("Could not fetch users from Firestore. Using local storage fallback:", error);
        const localUsersObj = JSON.parse(localStorage.getItem('evidencia_local_users') || '{}');
        const localUsersList = Object.values(localUsersObj) as UserProfile[];
        if (localUsersList.length > 0) {
          setUsers(localUsersList);
        } else {
          setUsers(DEFAULT_CUSTOMERS);
        }
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (activeTab === 'customers' || activeTab === 'overview') {
      fetchUsers();
    }
  }, [activeTab]);

  // Save General settings to localStorage and trigger system updates
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('evidencia_settings_whatsapp', shopWhatsApp.trim());
    localStorage.setItem('evidencia_settings_banner_text', promoBannerText.trim());
    localStorage.setItem('evidencia_settings_banner_active', isPromoBannerActive ? 'true' : 'false');
    
    // Cloudinary save
    localStorage.setItem('cloudinary_cloud_name', cloudinaryCloudName.trim());
    localStorage.setItem('cloudinary_upload_preset', cloudinaryUploadPreset.trim());

    setFormFeedback('Todas as configurações do site foram aplicadas com sucesso!');
    setTimeout(() => {
      setFormFeedback('');
      // Force refreshing the document state so header / footer pick it up
      window.dispatchEvent(new Event('storage'));
    }, 3000);
  };

  // Change user role and update Firestore/local lists
  const handleUpdateUserRole = async (userUid: string, newRole: 'customer' | 'seller' | 'admin') => {
    try {
      const userRef = doc(db, 'users', userUid);
      await setDoc(userRef, { role: newRole }, { merge: true });
      
      setUsers(prev => prev.map(u => u.uid === userUid ? { ...u, role: newRole } : u));

      // Update local catalog backup
      const localUsersObj = JSON.parse(localStorage.getItem('evidencia_local_users') || '{}');
      if (localUsersObj[userUid]) {
        localUsersObj[userUid].role = newRole;
        localStorage.setItem('evidencia_local_users', JSON.stringify(localUsersObj));
      }

      setFormFeedback(`Cargo do usuário atualizado com sucesso para: ${newRole}!`);
      setTimeout(() => setFormFeedback(''), 3000);
    } catch (e) {
      console.warn("Firestore role edit failed, updating locally:", e);
      setUsers(prev => prev.map(u => u.uid === userUid ? { ...u, role: newRole } : u));
      setFormFeedback(`Cargo atualizado localmente.`);
      setTimeout(() => setFormFeedback(''), 3000);
    }
  };

  // Inline stock adjustment handler
  const handleQuickStockUpdate = async (productId: string, currentStock: number, isAddition: boolean) => {
    const change = inlineStockValue[productId] || 1;
    const finalStock = isAddition ? currentStock + change : Math.max(0, currentStock - change);
    try {
      await updateProduct(productId, { stock: finalStock });
      setInlineStockValue(prev => ({ ...prev, [productId]: 1 })); // reset increment
    } catch (e) {
      console.error("Failed to update stock inline:", e);
    }
  };

  // Save Cloudinary Quick Config
  const handleSaveCloudinaryConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cloudinary_cloud_name', cloudinaryCloudName.trim());
    localStorage.setItem('cloudinary_upload_preset', cloudinaryUploadPreset.trim());
    setUploadFeedback('Configurações do Cloudinary salvas localmente!');
    setTimeout(() => setUploadFeedback(''), 3000);
  };

  const detectProductTypeFromCategory = (catName: string): 'calçados' | 'roupas' | 'acessórios' | 'perfumes' | 'eletrônicos' | 'geral' => {
    const name = catName.toLowerCase();
    if (name.includes('sapato') || name.includes('tênis') || name.includes('tenis') || name.includes('bota') || name.includes('sandália') || name.includes('sandalia') || name.includes('chinelo') || name.includes('calçado') || name.includes('calcado')) {
      return 'calçados';
    }
    if (name.includes('roupa') || name.includes('vestuário') || name.includes('vestuario') || name.includes('camisa') || name.includes('camiseta') || name.includes('calça') || name.includes('calca') || name.includes('bermuda') || name.includes('vestido') || name.includes('saia') || name.includes('short') || name.includes('jaqueta') || name.includes('casaco') || name.includes('infantil')) {
      return 'roupas';
    }
    if (name.includes('perfume') || name.includes('cosmético') || name.includes('cosmetico') || name.includes('beleza') || name.includes('maquiagem') || name.includes('colônia') || name.includes('colonia') || name.includes('body splash')) {
      return 'perfumes';
    }
    if (name.includes('acessório') || name.includes('acessorio') || name.includes('bolsa') || name.includes('carteira') || name.includes('cinto') || name.includes('óculos') || name.includes('oculos') || name.includes('relógio') || name.includes('relogio') || name.includes('joia') || name.includes('bijuteria')) {
      return 'acessórios';
    }
    if (name.includes('eletrônico') || name.includes('eletronico') || name.includes('fone') || name.includes('carregador') || name.includes('gadget') || name.includes('celular')) {
      return 'eletrônicos';
    }
    return 'geral';
  };

  const handleCategorySelectChange = (catName: string) => {
    setNewProdCategory(catName);
    if (!editingProduct) {
      const type = detectProductTypeFromCategory(catName);
      setNewProdProductType(type);
      if (type === 'calçados') setNewProdSizes([35, 36, 37, 38, 39, 40]);
      else if (type === 'roupas') setNewProdSizes(['P', 'M', 'G', 'GG']);
      else if (type === 'perfumes') setNewProdSizes(['100ml']);
      else setNewProdSizes(['Único']);
    }
  };

  const handleProductTypeChange = (type: 'calçados' | 'roupas' | 'acessórios' | 'perfumes' | 'eletrônicos' | 'geral') => {
    setNewProdProductType(type);
    if (type === 'calçados') setNewProdSizes([35, 36, 37, 38, 39, 40]);
    else if (type === 'roupas') setNewProdSizes(['P', 'M', 'G', 'GG']);
    else if (type === 'perfumes') setNewProdSizes(['100ml']);
    else setNewProdSizes(['Único']);
  };

  const handleSizeToggle = (size: number | string) => {
    setNewProdSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleAddCustomSize = () => {
    const val = customSizeInput.trim();
    if (!val) return;
    const item = !isNaN(Number(val)) ? Number(val) : val;
    if (!newProdSizes.includes(item)) {
      setNewProdSizes(prev => [...prev, item]);
    }
    setCustomSizeInput('');
  };

  const handleAddCustomAttribute = () => {
    if (!customAttrLabel.trim() || !customAttrValue.trim()) return;
    setNewProdCustomAttrs(prev => [...prev, { label: customAttrLabel.trim(), value: customAttrValue.trim() }]);
    setCustomAttrLabel('');
    setCustomAttrValue('');
  };

  const handleRemoveCustomAttribute = (index: number) => {
    setNewProdCustomAttrs(prev => prev.filter((_, i) => i !== index));
  };

  // Image Upload handler with Cloudinary and Base64 Fallback
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadFeedback('Erro: Formato inválido. Use JPG, PNG, WEBP ou GIF.');
      setTimeout(() => setUploadFeedback(''), 4000);
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadFeedback('Erro: Arquivo muito grande. Máximo de 5MB.');
      setTimeout(() => setUploadFeedback(''), 4000);
      return;
    }

    try {
      setIsUploading(true);
      if (cloudinaryCloudName && cloudinaryUploadPreset) {
        setUploadFeedback('Enviando para o Cloudinary...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryUploadPreset);

        const uploadPromise = fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout: conexão falhou")), 15000)
        );

        const response = await Promise.race([uploadPromise, timeoutPromise]);
        if (!response.ok) {
          throw new Error(`Erro do Cloudinary (${response.status})`);
        }

        const data = await response.json();
        if (data.secure_url) {
          setNewProdImages(prev => [...prev, data.secure_url]);
          setUploadFeedback('Foto carregada com sucesso no Cloudinary!');
        } else {
          throw new Error('Nenhum secure_url retornado');
        }
      } else {
        setUploadFeedback('Sem Cloudinary. Convertendo imagem para uso local...');
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setNewProdImages(prev => [...prev, reader.result as string]);
            setUploadFeedback('Imagem convertida e adicionada localmente!');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error: any) {
      console.warn("Cloudinary upload failed, using Base64 fallback:", error);
      setUploadFeedback(`Falha no upload. Convertendo localmente...`);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewProdImages(prev => [...prev, reader.result as string]);
          setUploadFeedback('Adicionada localmente com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadFeedback(''), 4000);
    }
  };

  const handleAddImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    try {
      const parsedUrl = new URL(newImageUrl.trim());
      setNewProdImages(prev => [...prev, parsedUrl.toString()]);
      setNewImageUrl('');
      setUploadFeedback('Imagem adicionada via link!');
      setTimeout(() => setUploadFeedback(''), 3000);
    } catch (_) {
      setUploadFeedback('Insira um link de imagem válido.');
      setTimeout(() => setUploadFeedback(''), 4000);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryFeedback('');

    if (!newCatName.trim() || newCatName.trim().length < 2) {
      setCategoryFeedback('Erro: O nome da categoria deve ter pelo menos 2 caracteres.');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: newCatName.trim(),
          description: newCatDesc.trim()
        });
        setCategoryFeedback('Categoria atualizada com sucesso!');
        setEditingCategory(null);
      } else {
        const catId = newCatName.toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove accents
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

        if (categories.some(c => c.id === catId)) {
          setCategoryFeedback('Erro: Já existe uma categoria parecida com esta.');
          return;
        }

        const newCat: Category = {
          id: catId,
          name: newCatName.trim(),
          description: newCatDesc.trim(),
          createdAt: new Date().toISOString()
        };

        await addCategory(newCat);
        setCategoryFeedback('Categoria cadastrada com sucesso!');
      }

      setNewCatName('');
      setNewCatDesc('');
      setTimeout(() => setCategoryFeedback(''), 2500);
    } catch (err: any) {
      setCategoryFeedback(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || '');
    setCategoryFeedback('');
  };

  const handleDeleteCategory = async (catId: string) => {
    if (window.confirm("Deseja mesmo excluir esta categoria? Os produtos existentes continuam no banco, mas a categoria não estará visível para filtros.")) {
      try {
        await deleteCategory(catId);
        setCategoryFeedback('Categoria removida com sucesso!');
        setTimeout(() => setCategoryFeedback(''), 2500);
      } catch (err: any) {
        setCategoryFeedback(`Erro ao remover: ${err.message}`);
      }
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setNewProdName('');
    setNewProdDesc('');
    setNewProdPrice('');
    setNewProdOriginalPrice('');
    setNewProdOnSale(false);
    setNewProdCategory('Sapatos Sociais');
    setNewProdProductType('calçados');
    setNewProdSizes([35, 36, 37, 38, 39, 40]);
    setNewProdBrand('');
    setNewProdGender('');
    setNewProdMaterial('');
    setNewProdColor('');
    setNewProdModelOrSku('');
    setNewProdWarrantyOrVolume('');
    setNewProdCustomAttrs([]);
    setNewProdImages([]);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProdName(product.name);
    setNewProdDesc(product.description);
    setNewProdPrice(product.price.toString());
    setNewProdOriginalPrice(product.originalPrice ? product.originalPrice.toString() : '');
    setNewProdOnSale(!!product.onSale);
    setNewProdCategory(product.category);
    setNewProdProductType(product.productType || detectProductTypeFromCategory(product.category));
    setNewProdSizes(product.sizes || []);
    setNewProdBrand(product.brand || '');
    setNewProdGender(product.gender || '');
    setNewProdMaterial(product.material || '');
    setNewProdColor(product.color || '');
    setNewProdModelOrSku(product.modelOrSku || '');
    setNewProdWarrantyOrVolume(product.warrantyOrVolume || '');
    setNewProdCustomAttrs(product.customAttributes || []);
    setNewProdImages(product.images || []);
    setNewProdCrediario(product.crediarioProprio !== false);
    setNewProdVisible(product.visible !== false);
    setNewProdStockControl(product.stockControl !== false);
    setNewProdStock(product.stock ? product.stock.toString() : '0');
    setActiveTab('new-product');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback('');

    if (!newProdName.trim() || newProdName.trim().length < 3) {
      setFormFeedback('Erro: O nome do produto deve ter pelo menos 3 caracteres.');
      return;
    }
    if (!newProdPrice) {
      setFormFeedback('Erro: O preço de venda é obrigatório.');
      return;
    }

    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormFeedback('Erro: O preço deve ser maior que zero.');
      return;
    }

    if (newProdImages.length === 0) {
      setFormFeedback('Erro: Envie pelo menos uma foto do produto.');
      return;
    }

    let stockNum = 0;
    if (newProdStockControl) {
      stockNum = parseInt(newProdStock, 10);
      if (isNaN(stockNum) || stockNum < 0) {
        setFormFeedback('Erro: Estoque inválido.');
        return;
      }
    }

    const sizesToSave = newProdSizes.length > 0 ? newProdSizes : ['Único'];

    try {
      if (editingProduct) {
        const productData: Partial<Product> = {
          name: newProdName.trim(),
          description: newProdDesc.trim(),
          price: priceNum,
          originalPrice: newProdOriginalPrice.trim() !== '' ? parseFloat(newProdOriginalPrice) : undefined,
          onSale: newProdOriginalPrice.trim() !== '' ? true : newProdOnSale,
          category: newProdCategory,
          productType: newProdProductType,
          sizes: sizesToSave,
          brand: newProdBrand.trim() || undefined,
          gender: newProdGender.trim() || undefined,
          material: newProdMaterial.trim() || undefined,
          color: newProdColor.trim() || undefined,
          modelOrSku: newProdModelOrSku.trim() || undefined,
          warrantyOrVolume: newProdWarrantyOrVolume.trim() || undefined,
          customAttributes: newProdCustomAttrs.length > 0 ? newProdCustomAttrs : undefined,
          images: newProdImages,
          crediarioProprio: newProdCrediario,
          visible: newProdVisible,
          stockControl: newProdStockControl,
          stock: stockNum
        };

        await updateProduct(editingProduct.id, productData);
        setFormFeedback('Produto atualizado com sucesso!');
        resetProductForm();
        
        setTimeout(() => {
          setFormFeedback('');
          setActiveTab('inventory');
        }, 1500);
      } else {
        const prodId = newProdName.toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') + `-${Math.floor(100+Math.random()*900)}`;

        const productData: Product = {
          id: prodId,
          name: newProdName.trim(),
          description: newProdDesc.trim(),
          price: priceNum,
          originalPrice: newProdOriginalPrice.trim() !== '' ? parseFloat(newProdOriginalPrice) : undefined,
          onSale: newProdOriginalPrice.trim() !== '' ? true : newProdOnSale,
          category: newProdCategory,
          productType: newProdProductType,
          sizes: sizesToSave,
          brand: newProdBrand.trim() || undefined,
          gender: newProdGender.trim() || undefined,
          material: newProdMaterial.trim() || undefined,
          color: newProdColor.trim() || undefined,
          modelOrSku: newProdModelOrSku.trim() || undefined,
          warrantyOrVolume: newProdWarrantyOrVolume.trim() || undefined,
          customAttributes: newProdCustomAttrs.length > 0 ? newProdCustomAttrs : undefined,
          images: newProdImages,
          crediarioProprio: newProdCrediario,
          visible: newProdVisible,
          stockControl: newProdStockControl,
          stock: stockNum
        };

        await addProduct(productData);
        setFormFeedback('Produto cadastrado com sucesso!');
        resetProductForm();
        
        setTimeout(() => {
          setFormFeedback('');
          setActiveTab('inventory');
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      setFormFeedback('Falha ao salvar produto no catálogo.');
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    const product = products.find(p => p.id === prodId);
    if (!product) return;
    if (window.confirm(`Tem certeza de que deseja excluir "${product.name}" do catálogo permanentemente?`)) {
      try {
        await deleteProduct(prodId);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleClaimOrder = async (orderId: string) => {
    if (!currentUser) return;
    try {
      await assignOrderSeller(orderId, currentUser.email, currentUser.name);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, status);
    } catch (e) {
      console.error(e);
    }
  };

  // Stats
  const totalProducts = products.length;
  const activeCategories = Array.from(new Set(products.map(p => p.category))).length;
  const totalSalesRevenue = orders
    .filter(o => o.status === 'Confirmado' || o.status === 'Entregue')
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'Pendente').length;
  const lowStockProducts = products.filter(p => p.stockControl && p.stock <= 5);

  // Category sales breakdown count
  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter lists
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.id.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCategory = catalogCategoryFilter === 'Todos' || p.category === catalogCategoryFilter;
    const matchesVisibility = catalogVisibilityFilter === 'Todos' || 
      (catalogVisibilityFilter === 'Visível' && p.visible !== false) || 
      (catalogVisibilityFilter === 'Oculto' && p.visible === false);
    return matchesSearch && matchesCategory && matchesVisibility;
  });

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(ordersSearch.toLowerCase()) || o.customerName.toLowerCase().includes(ordersSearch.toLowerCase());
    const matchesStatus = ordersStatusFilter === 'Todos' || o.status === ordersStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(usersSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(usersSearch.toLowerCase()) || 
      (u.cpf && u.cpf.includes(usersSearch));
    const matchesRole = usersRoleFilter === 'Todos' || u.role === usersRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div id="admin-panel-page" className="min-h-screen flex flex-col lg:flex-row text-xs">
      
      {/* Sidebar navigation */}
      <aside className={`w-full lg:w-64 border-b lg:border-b-0 lg:border-r p-6 flex flex-col justify-between transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-[#0f172a] border-slate-800 text-slate-100' 
          : 'bg-white border-slate-150 text-slate-800'
      }`}>
        <div className="space-y-8">
          
          {/* Dashboard Brand Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className={`text-sm font-black uppercase tracking-wider block ${
                theme === 'dark' ? 'text-amber-400' : 'text-primary'
              }`}>
                Evidência Calçados
              </span>
              <span className="text-[10px] text-slate-400 block font-semibold tracking-widest uppercase">
                Painel do Gestor
              </span>
            </div>
            
            <button 
              onClick={() => setCurrentView('home')} 
              className={`p-1.5 rounded-lg border transition-all ${
                theme === 'dark' ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'
              }`}
              title="Voltar para a Loja"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          {/* User profile identifier */}
          <div className={`p-4 rounded-xl flex items-center space-x-3 border ${
            theme === 'dark' ? 'bg-[#1e293b]/50 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="text-left truncate">
              <p className="font-bold truncate">{currentUser?.name}</p>
              <span className="text-[9px] bg-primary text-white font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wider">
                {currentUser?.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </span>
            </div>
          </div>

          {/* Sidebar Tabs Links */}
          <nav className="space-y-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 pb-2">Menu Principal</p>
            
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold transition-all flex items-center space-x-2.5 ${
                activeTab === 'overview' 
                  ? 'bg-primary text-white shadow-sm' 
                  : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart className="h-4 w-4" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold transition-all flex items-center space-x-2.5 ${
                activeTab === 'inventory' 
                  ? 'bg-primary text-white shadow-sm' 
                  : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Gerenciar Estoque</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold transition-all flex items-center justify-between ${
                activeTab === 'sales' 
                  ? 'bg-primary text-white shadow-sm' 
                  : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShoppingBag className="h-4 w-4" />
                <span>Pedidos Integrados</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'sales' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
              }`}>
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold transition-all flex items-center space-x-2.5 ${
                activeTab === 'customers' 
                  ? 'bg-primary text-white shadow-sm' 
                  : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Clientes &amp; Crediários</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold transition-all flex items-center space-x-2.5 ${
                activeTab === 'categories' 
                  ? 'bg-primary text-white shadow-sm' 
                  : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Gerenciar Categorias</span>
            </button>

            <button
              onClick={() => setActiveTab('moblink-products')}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold transition-all flex items-center justify-between ${
                activeTab === 'moblink-products'
                  ? 'bg-amber-500 text-slate-950 shadow-sm' 
                  : theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Package className="h-4 w-4 text-amber-500" />
                <span>Produtos do MobLink</span>
              </div>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                GET API
              </span>
            </button>

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-6 pb-2">Integrações &amp; ERP</p>

            <button
              onClick={() => setActiveTab('moblink')}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold transition-all flex items-center justify-between ${
                activeTab === 'moblink' 
                  ? 'bg-amber-500 text-slate-950 shadow-sm' 
                  : theme === 'dark' ? 'text-amber-400 hover:bg-slate-800' : 'text-amber-600 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                <span>Integração Moblink</span>
              </div>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                ERP
              </span>
            </button>

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-2">Configurações</p>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-bold transition-all flex items-center space-x-2.5 ${
                activeTab === 'settings' 
                  ? 'bg-primary text-white shadow-sm' 
                  : theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Ajustes do Site</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="pt-6 border-t border-slate-150/40 space-y-4">
          <button
            onClick={toggleTheme}
            className="w-full text-center py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-amber-400 transition-all cursor-pointer"
          >
            Modo {theme === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
          </button>
          
          <button
            onClick={() => setCurrentView('home')}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-all"
          >
            <span>Retornar ao Catálogo</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 p-6 sm:p-8 overflow-y-auto ${
        theme === 'dark' ? 'bg-[#0B0F19]' : 'bg-slate-50/50'
      }`}>
        
        {/* Header information */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 mb-8 gap-4 border-slate-200/60 dark:border-slate-800">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>{
                activeTab === 'overview' ? 'Visão Geral do Site' :
                activeTab === 'inventory' ? 'Gerenciador do Catálogo' :
                activeTab === 'sales' ? 'Painel de Pedidos Integrados' :
                activeTab === 'customers' ? 'Clientes & Crediários' :
                activeTab === 'new-product' ? (editingProduct ? 'Editar Calçado' : 'Adicionar Calçado') : 'Ajustes Administrativos'
              }</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Controle absoluto do site, produtos, estoque, configurações de redirecionamento de vendas e perfis de crédito.
            </p>
          </div>
          
          {/* Quick trigger trigger to clear form feedback */}
          {formFeedback && (
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 rounded-xl px-4 py-2 flex items-center space-x-1.5 font-bold animate-pulse text-[11px]">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>{formFeedback}</span>
            </div>
          )}
        </header>

        {/* ----------------- TAB 1: OVERVIEW (DASHBOARD) ----------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* KPI Metrics Dashboard Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800/80' : 'bg-white border-slate-100 shadow-xs'
              }`}>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[9px]">Calçados no Catálogo</span>
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-2xl font-black mt-2">{totalProducts}</h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Categorias ativas: {activeCategories}</p>
              </div>

              <div className={`p-5 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800/80' : 'bg-white border-slate-100 shadow-xs'
              }`}>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[9px]">Faturamento Confirmado</span>
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black mt-2">R$ {totalSalesRevenue.toFixed(2).replace('.', ',')}</h3>
                <p className="text-[10px] text-emerald-600 mt-1 font-bold">Pedidos faturados e entregues</p>
              </div>

              <div className={`p-5 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800/80' : 'bg-white border-slate-100 shadow-xs'
              }`}>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[9px]">Clientes Registrados</span>
                  <Users className="h-4 w-4 text-indigo-500" />
                </div>
                <h3 className="text-2xl font-black mt-2">{users.length || DEFAULT_CUSTOMERS.length}</h3>
                <p className="text-[10px] text-indigo-600 mt-1 font-bold">Perfis com crediário próprio</p>
              </div>

              <div className={`p-5 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800/80' : 'bg-white border-slate-100 shadow-xs'
              }`}>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[9px]">Aguardando WhatsApp</span>
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                </div>
                <h3 className="text-2xl font-black mt-2 text-amber-600">{pendingOrdersCount}</h3>
                <p className="text-[10px] text-amber-500 mt-1 font-semibold">Pedidos na fila pendente</p>
              </div>
            </div>

            {/* Middle row: Category sales & Low Stock console */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Category distribution */}
              <div className={`lg:col-span-1 p-6 rounded-2xl border ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
              }`}>
                <h3 className="font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-4">Distribuição do Catálogo</h3>
                <div className="space-y-4">
                  {Object.entries(categoryCounts).map(([catName, count]) => {
                    const percentage = totalProducts > 0 ? ((count as number) / totalProducts) * 100 : 0;
                    return (
                      <div key={catName} className="space-y-1 text-left">
                        <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                          <span>{catName}</span>
                          <span>{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-150 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(categoryCounts).length === 0 && (
                    <p className="text-center text-slate-400 italic py-4">Sem calçados cadastrados.</p>
                  )}
                </div>
              </div>

              {/* Low stock alerts directly restockable console */}
              <div className={`lg:col-span-2 p-6 rounded-2xl border text-left ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold uppercase tracking-wider text-[10px] text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 animate-pulse text-red-500" />
                      <span>Alerta de Estoque Crítico ({lowStockProducts.length})</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Calçados com 5 ou menos unidades na grade. Reponha estoque diretamente abaixo:</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('inventory')} 
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    Ver Tudo
                  </button>
                </div>

                {lowStockProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-150 dark:border-slate-800 rounded-xl">
                    <Check className="h-8 w-8 text-green-500 mb-2" />
                    <p className="text-slate-400 italic font-light">Estoque 100% normalizado. Nenhum calçado em nível crítico!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[220px] overflow-y-auto pr-2">
                    {lowStockProducts.map(p => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center space-x-3">
                          <img src={p.images?.[0] || p.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'} className="w-9 h-9 object-cover rounded border border-slate-150" alt="" />
                          <div>
                            <p className="font-bold">{p.name}</p>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{p.category}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                            p.stock === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {p.stock} un
                          </span>
                          
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              min="1"
                              placeholder="+5"
                              value={inlineStockValue[p.id] || ''}
                              onChange={(e) => setInlineStockValue({ ...inlineStockValue, [p.id]: parseInt(e.target.value) || 1 })}
                              className="w-12 p-1 text-center border border-slate-200 rounded-md bg-white text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              onClick={() => handleQuickStockUpdate(p.id, p.stock, true)}
                              className="p-1 bg-primary text-white rounded-md hover:bg-secondary font-bold cursor-pointer"
                              title="Adicionar ao estoque"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Recents Orders overview snippet */}
            <div className={`p-6 rounded-2xl border text-left ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
            }`}>
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Atividades de Vendas Recentes</h3>
                <button onClick={() => setActiveTab('sales')} className="text-[10px] font-bold text-primary hover:underline">Ir para Pedidos</button>
              </div>

              {orders.length === 0 ? (
                <p className="text-center text-slate-400 italic py-6">Nenhum pedido integrado recebido ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="py-2.5">ID Pedido</th>
                        <th className="py-2.5">Cliente</th>
                        <th className="py-2.5">Valor</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5 text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-600 dark:text-slate-300">
                      {orders.slice(0, 4).map(o => (
                        <tr key={o.id} className="hover:bg-slate-50/20">
                          <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{o.id}</td>
                          <td className="py-3 font-medium">{o.customerName}</td>
                          <td className="py-3 font-bold text-primary">R$ {o.total.toFixed(2).replace('.', ',')}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              o.status === 'Confirmado' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                              o.status === 'Entregue' ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300' :
                              o.status === 'Cancelado' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 
                              'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 text-right text-[10px] text-slate-400">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ----------------- TAB 2: INVENTORY (PRODUCT CATALOG) ----------------- */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Catalog search tools bar */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
            }`}>
              
              {/* Live search input */}
              <div className="relative w-full md:max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar sapatos ou acessórios..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium placeholder-slate-400 text-xs focus:outline-none focus:border-primary"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>

              {/* Advanced category filters dropdown */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center space-x-1.5">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Categoria:</span>
                </div>
                
                <select
                  value={catalogCategoryFilter}
                  onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-[11px] font-bold focus:outline-none focus:border-primary"
                >
                  <option value="Todos">Todos os Produtos</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <select
                  value={catalogVisibilityFilter}
                  onChange={(e) => setCatalogVisibilityFilter(e.target.value)}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-[11px] font-bold focus:outline-none focus:border-primary"
                >
                  <option value="Todos">Visibilidade (Todos)</option>
                  <option value="Visível">Somente Visíveis</option>
                  <option value="Oculto">Somente Ocultos</option>
                </select>
              </div>

            </div>

            {/* Catalog Grid Table */}
            <div className={`border rounded-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="p-4 text-left">Foto &amp; Nome</th>
                      <th className="p-4 text-left">Categoria</th>
                      <th className="p-4 text-left">Grade Tamanhos</th>
                      <th className="p-4 text-left">Preço</th>
                      <th className="p-4 text-left">Estoque Geral</th>
                      <th className="p-4 text-left">Visibilidade</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-all">
                        {/* Name, ID & thumbnail */}
                        <td className="p-4 flex items-center space-x-3 min-w-[220px]">
                          <img src={p.images?.[0] || p.foto_uri || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop'} className="w-11 h-11 object-cover rounded-lg border border-slate-150 shadow-xs bg-white" alt={p.name} />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {p.id}</p>
                          </div>
                        </td>

                        {/* Category badge */}
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 rounded font-semibold text-[10px] uppercase">
                            {p.category}
                          </span>
                        </td>

                        {/* Sizes grade listing */}
                        <td className="p-4 max-w-[150px]">
                          <p className="flex flex-wrap gap-1">
                            {p.category === 'Acessórios' ? (
                              <span className="text-slate-400 font-light italic">Não se aplica</span>
                            ) : (
                              p.sizes.slice(0, 7).map(s => (
                                <span key={s} className="px-1 bg-slate-50 border border-slate-100 text-slate-500 font-mono font-bold text-[9px] rounded-sm">
                                  {s}
                                </span>
                              ))
                            )}
                            {p.sizes.length > 7 && (
                              <span className="text-[9px] text-slate-400 font-bold pl-1">+{p.sizes.length - 7} grades</span>
                            )}
                          </p>
                        </td>

                        {/* Price & original price */}
                        <td className="p-4">
                          <p className="font-bold text-primary">R$ {p.price.toFixed(2).replace('.', ',')}</p>
                          {p.originalPrice && (
                            <p className="text-[9.5px] text-slate-400 line-through font-semibold">R$ {p.originalPrice.toFixed(2).replace('.', ',')}</p>
                          )}
                        </td>

                        {/* Inventory quick stock editor column */}
                        <td className="p-4">
                          {p.stockControl ? (
                            <div className="flex flex-col space-y-1">
                              <span className={`font-mono font-bold text-[11px] ${
                                p.stock <= 5 ? 'text-red-500 font-black' : 'text-slate-700 dark:text-slate-200'
                              }`}>
                                {p.stock} unidades
                              </span>
                              <span className="inline-flex items-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/50 w-max" title="Estoque controlado exclusivamente pela API do MobLink">
                                🔒 API MobLink
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Infinito</span>
                          )}
                        </td>

                        {/* Visível na Loja indicator */}
                        <td className="p-4">
                          <button
                            onClick={() => updateProduct(p.id, { visible: p.visible !== false ? false : true })}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center space-x-1.5 cursor-pointer transition-all ${
                              p.visible !== false 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-red-50 border-red-150 text-red-500'
                            }`}
                            title="Clique para alternar visibilidade instantaneamente"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${p.visible !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span>{p.visible !== false ? 'Público' : 'Oculto'}</span>
                          </button>
                        </td>

                        {/* Item management actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleEditProduct(p)}
                              className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                              title="Editar Produto"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Excluir do Catálogo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic font-light">Nenhum calçado localizado com os filtros aplicados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ----------------- TAB 3: SALES / INTEGRATED ORDERS ----------------- */}
        {activeTab === 'sales' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Orders log filters */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
            }`}>
              
              <div className="relative w-full md:max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar por ID ou Nome do Cliente..."
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs focus:outline-none focus:border-primary"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Filtrar por Status:</span>
                <div className="flex flex-wrap gap-1">
                  {(['Todos', 'Pendente', 'Confirmado', 'Entregue', 'Cancelado'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrdersStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                        ordersStatusFilter === st
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Orders queue */}
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                return (
                  <div 
                    key={order.id} 
                    className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                      theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
                    } ${isExpanded ? 'ring-1 ring-primary' : ''}`}
                  >
                    
                    {/* Collapsed top bar row */}
                    <div 
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer hover:bg-slate-50/20"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-sm">{order.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            order.status === 'Confirmado' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            order.status === 'Entregue' ? 'bg-green-50 text-green-700 border border-green-100' :
                            order.status === 'Cancelado' ? 'bg-red-50 text-red-700 border border-red-100' : 
                            'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Cliente: <span className="text-slate-700 dark:text-slate-200 font-bold">{order.customerName}</span> ({order.customerEmail})
                        </p>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-slate-400 text-[10px]">Total Integrado</p>
                          <p className="font-extrabold text-primary text-sm">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                        </div>
                        
                        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-95 text-primary' : ''}`} />
                      </div>
                    </div>

                    {/* Detailed Invoice panel */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-5 space-y-6 bg-slate-50/30 dark:bg-slate-900/10">
                        
                        {/* Summary details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Metadados do Pedido</h4>
                            <p className="font-medium text-slate-600 dark:text-slate-300">Data Registro: {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR')}</p>
                            <p className="font-medium text-slate-600 dark:text-slate-300">Forma Pagamento: Crediário / WhatsApp</p>
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Atendimento de Vendas</h4>
                            {order.sellerEmail ? (
                              <div className="space-y-1">
                                <p className="font-bold text-slate-700 dark:text-slate-200">Atendido por: {order.sellerName}</p>
                                <p className="text-[10px] text-slate-400">E-mail: {order.sellerEmail}</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <span className="text-amber-600 font-bold text-[10px] flex items-center gap-1.5">
                                  ⚠️ Aguardando vendedor assumir
                                </span>
                                <button
                                  onClick={() => handleClaimOrder(order.id)}
                                  className="px-3 py-1 bg-primary text-white font-bold text-[10px] rounded hover:bg-secondary cursor-pointer"
                                >
                                  Assumir Atendimento
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Ações de Resposta</h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => window.open(order.whatsappUrl, '_blank')}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-[#25D366] text-white font-bold text-[10px] rounded-lg hover:bg-[#20ba5a] cursor-pointer"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Contatar via WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* List of items */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-2">Artigos Comprados</h4>
                          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/10">
                                <div className="flex items-center space-x-3">
                                  {item.image && (
                                    <img src={item.image} className="w-9 h-9 object-cover rounded border" alt="" />
                                  )}
                                  <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                                    <span className="text-[10px] text-slate-400">
                                      {item.selectedSize !== 0 ? `Tamanho: ${item.selectedSize}` : 'Acessório'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-700 dark:text-slate-200">
                                    {item.quantity}x de R$ {item.price.toFixed(2).replace('.', ',')}
                                  </p>
                                  <p className="text-[10px] text-primary font-bold">R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order status switcher action buttons */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Alterar Status do Pedido:</span>
                            {(['Pendente', 'Confirmado', 'Entregue', 'Cancelado'] as OrderStatus[]).map((statusValue) => (
                              <button
                                key={statusValue}
                                onClick={() => handleUpdateStatus(order.id, statusValue)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                                  order.status === statusValue
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350'
                                }`}
                              >
                                {statusValue}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                );
              })}
              {filteredOrders.length === 0 && (
                <div className="bg-white dark:bg-[#0f172a] border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 italic font-light">
                  Nenhum pedido integrado foi localizado com os critérios informados.
                </div>
              )}
            </div>

          </div>
        )}

        {/* ----------------- TAB 4: CUSTOMERS & CREDIT PROFILES (NEW) ----------------- */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-fade-in text-left">
            
            {/* Customer Search header options */}
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
            }`}>
              
              <div className="relative w-full md:max-w-xs">
                <input
                  type="text"
                  placeholder="Buscar por Nome, E-mail ou CPF..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs focus:outline-none focus:border-primary"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Filtrar por Função:</span>
                <select
                  value={usersRoleFilter}
                  onChange={(e) => setUsersRoleFilter(e.target.value as any)}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-[11px] font-bold"
                >
                  <option value="Todos">Todas as funções</option>
                  <option value="customer">Clientes (Crediário)</option>
                  <option value="seller">Vendedores (Atendentes)</option>
                  <option value="admin">Administradores</option>
                </select>
              </div>

            </div>

            {/* Customers list and detailed dossier */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* User list */}
              <div className={`lg:col-span-1 border rounded-2xl overflow-hidden flex flex-col h-[520px] ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
              }`}>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Perfis Registrados ({filteredUsers.length})</span>
                  {isLoadingUsers && <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-y-auto flex-1">
                  {filteredUsers.map((u) => {
                    const isSelected = selectedUserUid === u.uid;
                    const hasCrediario = !!(u.rg && u.cpf && u.nomeMae);
                    return (
                      <div
                        key={u.uid}
                        onClick={() => setSelectedUserUid(u.uid)}
                        className={`p-4 text-left cursor-pointer transition-all flex items-start justify-between gap-2 hover:bg-slate-50/30 ${
                          isSelected ? (theme === 'dark' ? 'bg-primary/10 border-l-4 border-primary' : 'bg-primary/5 border-l-4 border-primary') : ''
                        }`}
                      >
                        <div className="space-y-1 truncate">
                          <p className="font-bold truncate text-slate-800 dark:text-slate-100">{u.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                          
                          {/* Profile completion badge */}
                          {u.role === 'customer' && (
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-1 uppercase ${
                              hasCrediario 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                            }`}>
                              {hasCrediario ? 'Crediário Aprovado' : 'Ficha Incompleta'}
                            </span>
                          )}
                        </div>

                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-sm ${
                          u.role === 'admin' ? 'bg-red-50 text-red-600' :
                          u.role === 'seller' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.role === 'admin' ? 'ADM' : u.role === 'seller' ? 'Vend.' : 'Cli.'}
                        </span>
                      </div>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-slate-400 italic py-8">Nenhum cliente cadastrado.</p>
                  )}
                </div>
              </div>

              {/* dossier section */}
              <div className="lg:col-span-2">
                {selectedUserUid ? (
                  (() => {
                    const selectedUser = users.find(u => u.uid === selectedUserUid);
                    if (!selectedUser) return null;
                    const hasIncompleteCrediario = selectedUser.role === 'customer' && 
                      (!selectedUser.rg || !selectedUser.cpf || !selectedUser.nomeMae || !selectedUser.endereco);
                    
                    return (
                      <div className={`p-6 sm:p-8 rounded-2xl border space-y-6 ${
                        theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
                      }`}>
                        
                        {/* dossier Top information */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full bg-primary text-white font-extrabold text-lg flex items-center justify-center">
                              {selectedUser.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-base font-extrabold">{selectedUser.name}</h3>
                              <p className="text-[10px] text-slate-400">ID Único: <span className="font-mono">{selectedUser.uid}</span></p>
                            </div>
                          </div>

                          {/* Quick access control */}
                          <div className="space-y-1">
                            <label className="font-bold text-slate-400 text-[8px] uppercase tracking-wider block text-left">Função Hierárquica</label>
                            <select
                              value={selectedUser.role}
                              onChange={(e) => handleUpdateUserRole(selectedUser.uid, e.target.value as any)}
                              className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold focus:outline-none"
                            >
                              <option value="customer">Cliente Comum</option>
                              <option value="seller">Vendedor Interno</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                        </div>

                        {/* Crediário pending warning */}
                        {hasIncompleteCrediario && (
                          <div className="bg-amber-50 text-amber-800 border border-amber-100 rounded-xl p-4 flex items-start space-x-2.5">
                            <span className="text-base mt-0.5">⚠️</span>
                            <div>
                              <p className="font-bold text-xs">Ficha Cadastral Pendente!</p>
                              <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
                                Este cliente não completou as informações essenciais necessárias para compras no Crediário Próprio (CPF, RG, Filiação ou Endereço residencial). Instrua-o a preencher esses dados no menu da loja antes de fechar o pedido.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Credit evaluation details */}
                        <div className="space-y-4">
                          <h4 className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                            <UserCheck className="h-4 w-4 text-primary" />
                            <span>Dossiê para Consulta de Crédito (Crediário Próprio)</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            {/* Personal information */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left space-y-2">
                              <p className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase border-b pb-1">Identificação Pessoal</p>
                              <p><span className="text-slate-400 font-semibold">CPF:</span> <span className="font-mono text-slate-800 dark:text-slate-200">{selectedUser.cpf || 'Não informado'}</span></p>
                              <p><span className="text-slate-400 font-semibold">RG:</span> <span className="font-mono text-slate-800 dark:text-slate-200">{selectedUser.rg || 'Não informado'}</span></p>
                              <p><span className="text-slate-400 font-semibold">Data Nasc:</span> <span className="text-slate-800 dark:text-slate-200">{selectedUser.dataNascimento ? new Date(selectedUser.dataNascimento).toLocaleDateString('pt-BR') : 'Não informada'}</span></p>
                              <p><span className="text-slate-400 font-semibold">Naturalidade:</span> <span className="text-slate-800 dark:text-slate-200">{selectedUser.naturalidade || 'Não informada'}</span></p>
                              <p className="pt-1"><span className="text-slate-400 font-semibold">Filiação (Mãe):</span> <span className="text-slate-800 dark:text-slate-200 font-bold">{selectedUser.nomeMae || 'Não informada'}</span></p>
                              {selectedUser.nomePai && <p><span className="text-slate-400 font-semibold">Filiação (Pai):</span> <span className="text-slate-800 dark:text-slate-200">{selectedUser.nomePai}</span></p>}
                            </div>

                            {/* Contact and address */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-left space-y-2">
                              <p className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase border-b pb-1">Contato &amp; Localização</p>
                              <p><span className="text-slate-400 font-semibold">E-mail:</span> <span className="text-slate-800 dark:text-slate-200">{selectedUser.email}</span></p>
                              <p><span className="text-slate-400 font-semibold">Telefone:</span> <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">{selectedUser.telefone || 'Não informado'}</span></p>
                              <p><span className="text-slate-400 font-semibold">CEP:</span> <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedUser.cep || 'Não informado'}</span></p>
                              <p><span className="text-slate-400 font-semibold">Endereço:</span> <span className="text-slate-800 dark:text-slate-200">{selectedUser.endereco ? `${selectedUser.endereco}, ${selectedUser.numero || ''}` : 'Não informado'}</span></p>
                              <p><span className="text-slate-400 font-semibold">Bairro/Cidade:</span> <span className="text-slate-800 dark:text-slate-200">{selectedUser.bairro ? `${selectedUser.bairro} - ${selectedUser.cidade}/${selectedUser.uf}` : 'Não informado'}</span></p>
                              {selectedUser.complemento && <p><span className="text-slate-400 font-semibold">Complemento:</span> <span className="text-slate-800 dark:text-slate-200">{selectedUser.complemento}</span></p>}
                              {selectedUser.pontoReferencia && <p><span className="text-slate-400 font-semibold">Referência:</span> <span className="text-slate-800 dark:text-slate-200">{selectedUser.pontoReferencia}</span></p>}
                            </div>

                          </div>
                        </div>

                      </div>
                    );
                  })()
                ) : (
                  <div className={`p-12 text-center text-slate-400 border border-dashed rounded-2xl flex flex-col items-center justify-center h-[520px] ${
                    theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
                  }`}>
                    <Users className="h-10 w-10 text-slate-300 mb-2" />
                    <p className="font-medium">Nenhum cliente selecionado</p>
                    <p className="text-[11px] text-slate-400 font-light mt-1">Selecione um cliente na lista lateral para carregar a ficha de crédito e consultar CPF/RG para aprovação de Crediário Próprio.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ----------------- TAB 5: SITE & SYSTEM SETTINGS (NEW) ----------------- */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in text-left">
            
            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              {/* Box 1: Store general config */}
              <div className={`p-6 sm:p-8 rounded-2xl border space-y-5 ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
              }`}>
                <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 border-b pb-3 flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-primary" />
                  <span>Ajustes Operacionais da Loja</span>
                </h3>

                <div className="space-y-4">
                  {/* WhatsApp contact redirect */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block uppercase tracking-wider text-[9px]">WhatsApp de Atendimento da Loja</label>
                    <input
                      type="text"
                      required
                      value={shopWhatsApp}
                      onChange={(e) => setShopWhatsApp(e.target.value)}
                      placeholder="Ex: 5599984684867"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-primary"
                    />
                    <span className="text-[10px] text-slate-400">Insira o código internacional + DDD + Número completo sem traços ou parênteses. (Ex: 5599984684867 para Caxias-MA).</span>
                  </div>

                  {/* Header promo banner */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-600 block uppercase tracking-wider text-[9px]">Faixa de Alerta Promocional (Banner Superior)</label>
                      <button
                        type="button"
                        onClick={() => setIsPromoBannerActive(!isPromoBannerActive)}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer"
                      >
                        {isPromoBannerActive ? '● Ativo' : '○ Inativo'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={promoBannerText}
                      onChange={(e) => setPromoBannerText(e.target.value)}
                      placeholder="Ex: Liquidação de Sapatos de Couro com 30% OFF!"
                      disabled={!isPromoBannerActive}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-primary disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Cloudinary configs */}
              <div className={`p-6 sm:p-8 rounded-2xl border space-y-4 ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'
              }`}>
                <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 border-b pb-3 flex items-center gap-1.5">
                  <span>☁️ Armazenamento em Nuvem (Cloudinary)</span>
                </h3>
                
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Para habilitar upload estável e permanente de imagens para novos sapatos: crie uma conta gratuita em <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">cloudinary.com</a>, acesse as configurações, crie um <strong>Unsigned Upload Preset</strong> e insira os dados abaixo:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[9px] block uppercase tracking-wider">Cloud Name</label>
                    <input
                      type="text"
                      value={cloudinaryCloudName}
                      onChange={(e) => setCloudinaryCloudName(e.target.value)}
                      placeholder="Ex: dpxyourcloud"
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[9px] block uppercase tracking-wider">Upload Preset</label>
                    <input
                      type="text"
                      value={cloudinaryUploadPreset}
                      onChange={(e) => setCloudinaryUploadPreset(e.target.value)}
                      placeholder="Ex: sapatos_preset"
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Box 3: Reset system */}
              <div className={`p-6 rounded-2xl border border-red-100 bg-red-50/10 text-left space-y-3`}>
                <h4 className="font-bold text-red-500 text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Trash2 className="h-4 w-4" />
                  <span>Área de Segurança &amp; Manutenção</span>
                </h4>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">
                  Se você desejar restaurar o catálogo de calçados original do site (sapatos sociais, tênis e botas iniciais) ou limpar simulações locais, clique no botão de reset abaixo. Essa operação restabelecerá os dados iniciais do banco de dados local.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Atenção: Isso redefinirá os produtos locais para o catálogo inicial de fábrica. Deseja prosseguir?")) {
                      localStorage.removeItem('evidencia_local_products');
                      localStorage.removeItem('evidencia_local_orders');
                      localStorage.removeItem('evidencia_local_users');
                      setFormFeedback("Sistema reiniciado localmente! Recarregue a página.");
                      setTimeout(() => window.location.reload(), 1500);
                    }
                  }}
                  className="px-4 py-2 bg-[#9a031e] text-white hover:bg-red-800 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Resetar Banco Local para Fábrica
                </button>
              </div>

              {/* Submit footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/50">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-white hover:bg-secondary font-bold rounded-lg shadow-md transition-all cursor-pointer"
                >
                  Salvar Todas as Configurações
                </button>
              </div>

            </form>

          </div>
        )}

        {/* ----------------- TAB: CATEGORIES MANAGEMENT ----------------- */}
        {activeTab === 'categories' && (
          <div className="max-w-6xl mx-auto animate-fade-in text-left space-y-6">
            {categoryFeedback && (
              <div className={`p-4 rounded-xl border flex items-center space-x-2 text-xs font-bold ${
                categoryFeedback.startsWith('Erro') 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : 'bg-emerald-50 border-emerald-250 text-emerald-800'
              }`}>
                <AlertCircle className="h-4 w-4" />
                <span>{categoryFeedback}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Box 1: Form Cadastro */}
              <div className={`p-6 rounded-2xl border space-y-4 h-fit ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
              }`}>
                <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 border-b pb-3">
                  {editingCategory ? '✏️ Editar Categoria' : '➕ Nova Categoria'}
                </h3>

                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[9px] block uppercase tracking-wider">Nome da Categoria</label>
                    <input
                      type="text"
                      required
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Ex: Roupas Femininas, Bolsas, etc."
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 text-[9px] block uppercase tracking-wider">Descrição Curta</label>
                    <textarea
                      rows={3}
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="Diga brevemente quais produtos fazem parte..."
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-primary hover:bg-secondary text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                    >
                      {editingCategory ? 'Salvar Alterações' : 'Cadastrar Categoria'}
                    </button>
                    {editingCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(null);
                          setNewCatName('');
                          setNewCatDesc('');
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Box 2: Categorias Cadastradas */}
              <div className={`md:col-span-2 p-6 rounded-2xl border space-y-4 ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
              }`}>
                <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400 border-b pb-3 flex justify-between items-center">
                  <span>📂 Categorias Disponíveis ({categories.length})</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="p-3">Nome</th>
                        <th className="p-3">Slug/ID</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                      {categories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-50/20 text-slate-700 dark:text-slate-300">
                          <td className="p-3 font-bold">{cat.name}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">{cat.id}</td>
                          <td className="p-3 text-slate-500 max-w-xs truncate" title={cat.description}>
                            {cat.description || <span className="italic text-slate-400 font-light text-[10px]">Sem descrição</span>}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEditCategory(cat)}
                                className="p-1 text-slate-400 hover:text-primary hover:bg-slate-50 rounded transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-amber-50/25 border border-amber-200/50 rounded-xl p-4 text-[10px] text-amber-800 flex gap-2">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Dica de Organização:</strong> Quando você cadastra uma nova categoria, ela fica disponível instantaneamente no formulário de cadastro de produtos e como pílula de filtro na página inicial da loja. Seus clientes poderão filtrar todos os artigos cadastrados nela imediatamente.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ----------------- TAB 6: NEW PRODUCT / EDIT FORM ----------------- */}
        {activeTab === 'new-product' && (
          <div className="max-w-4xl mx-auto animate-fade-in text-left">
            <div className={`border rounded-2xl p-6 sm:p-8 ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
            }`}>
              
              <div className="border-b pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {editingProduct ? `Editando Produto: ${editingProduct.name}` : 'Cadastrar Novo Produto'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Preencha os dados do artigo. O formulário se ajusta dinamicamente conforme a categoria.
                  </p>
                </div>
                {editingProduct && (
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="text-[10px] font-bold text-primary hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    + Limpar para Novo Cadastro
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-6 text-xs">
                
                {/* 1. Category and Product Type Selector Header */}
                <div className="p-4 rounded-xl border bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[9px]">
                        1. Categoria do Artigo
                      </label>
                      <select
                        value={newProdCategory}
                        onChange={(e) => handleCategorySelectChange(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:border-primary cursor-pointer"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[9px]">
                        2. Tipo de Produto (Define Formato dos Dados)
                      </label>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          { id: 'calçados', label: '👞 Calçados' },
                          { id: 'roupas', label: '👕 Roupas' },
                          { id: 'acessórios', label: '👜 Acessórios' },
                          { id: 'perfumes', label: '🧴 Perfumes / Beleza' },
                          { id: 'eletrônicos', label: '📱 Eletrônicos' },
                          { id: 'geral', label: '📦 Geral' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleProductTypeChange(item.id as any)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                              newProdProductType === item.id
                                ? 'bg-primary border-primary text-white shadow-xs scale-105'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-350'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Informações Básicas</h4>
                  
                  {/* Product Name */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block uppercase tracking-wider text-[9px]">Nome do Produto</label>
                    <input
                      type="text"
                      required
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      placeholder={
                        newProdProductType === 'calçados' ? "Ex: Sapato Social Oxford em Couro Legítimo" :
                        newProdProductType === 'roupas' ? "Ex: Camisa Social Slim Fit Algodão Premium" :
                        newProdProductType === 'perfumes' ? "Ex: Perfume Malbec Absoluto Eau de Parfum 100ml" :
                        newProdProductType === 'acessórios' ? "Ex: Bolsa Feminina Transversal de Couro" :
                        "Ex: Nome do Produto"
                      }
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Pricing - Locked to MobLink API */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase tracking-wider text-[9px]">Preço de Venda (R$)</label>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/50 flex items-center gap-1">
                          🔒 API MobLink (Leitura)
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        disabled
                        readOnly
                        value={newProdPrice}
                        placeholder="0,00"
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        title="Este preço é consumido diretamente da API do MobLink e não pode ser editado no painel."
                      />
                      <p className="text-[9px] text-slate-400 italic">Atualizado automaticamente via integração ERP.</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase tracking-wider text-[9px]">Preço Original / De (R$)</label>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/50 flex items-center gap-1">
                          🔒 API MobLink (Leitura)
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        disabled
                        readOnly
                        value={newProdOriginalPrice}
                        placeholder="Ex: 299,90"
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        title="O preço original de tabela vem da API do MobLink e não pode ser editado manualmente."
                      />
                      <p className="text-[9px] text-slate-400 italic">Calculado via tabela de preços do ERP.</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600 block uppercase tracking-wider text-[9px]">Descrição Detalhada</label>
                    <textarea
                      rows={3}
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      placeholder="Descreva as principais características, acabamento, estilo, recomendações de uso..."
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* 3. Dynamic Specifications & Size / Variation Options */}
                <div className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Sliders className="h-3.5 w-3.5 text-primary" />
                      Especificações do Produto ({newProdProductType.toUpperCase()})
                    </h4>
                    <span className="text-[9px] text-slate-400">Ajuste de tamanhos e atributos</span>
                  </div>

                  {/* --- SIZES / VARIATIONS CONTROL PANEL --- */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase tracking-wider text-[9px]">
                        {newProdProductType === 'calçados' ? 'Grade de Numeração' :
                         newProdProductType === 'roupas' ? 'Grade de Tamanhos (PP ao XGG / Numeração)' :
                         newProdProductType === 'perfumes' ? 'Volumes / Frascos Disponíveis' :
                         'Variações / Opções Disponíveis'}
                      </label>
                      
                      {/* Quick Presets based on Type */}
                      <div className="flex flex-wrap gap-1 text-[9px]">
                        <span className="text-slate-400 self-center mr-1 font-bold">Presets Rápidos:</span>
                        {newProdProductType === 'calçados' && (
                          <button
                            type="button"
                            onClick={() => setNewProdSizes([34, 35, 36, 37, 38, 39, 40, 41, 42])}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-primary hover:text-white transition-colors cursor-pointer"
                          >
                            Padrao 34-42
                          </button>
                        )}
                        {newProdProductType === 'roupas' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setNewProdSizes(['P', 'M', 'G', 'GG'])}
                              className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-primary hover:text-white transition-colors cursor-pointer"
                            >
                              P, M, G, GG
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewProdSizes([36, 38, 40, 42, 44, 46])}
                              className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-primary hover:text-white transition-colors cursor-pointer"
                            >
                              36 ao 46
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewProdSizes(['Infantil 2', '4', '6', '8', '10', '12', '14'])}
                              className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-primary hover:text-white transition-colors cursor-pointer"
                            >
                              Infantil
                            </button>
                          </>
                        )}
                        {newProdProductType === 'perfumes' && (
                          <button
                            type="button"
                            onClick={() => setNewProdSizes(['30ml', '50ml', '100ml'])}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-primary hover:text-white transition-colors cursor-pointer"
                          >
                            30ml, 50ml, 100ml
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNewProdSizes(['Único'])}
                          className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-primary hover:text-white transition-colors cursor-pointer"
                        >
                          Tamanho Único
                        </button>
                      </div>
                    </div>

                    {/* Shoe Number buttons or Custom Tag chips */}
                    {newProdProductType === 'calçados' ? (
                      <div className="flex flex-wrap gap-1.5">
                        {[28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44].map((sz) => {
                          const isChecked = newProdSizes.includes(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleSizeToggle(sz)}
                              className={`w-9 h-9 font-mono font-bold text-xs border rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                                isChecked
                                  ? 'bg-primary border-primary text-white shadow-xs scale-105'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-350'
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-center">
                        {newProdSizes.map((sz, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary dark:text-amber-400 font-bold rounded-lg text-xs"
                          >
                            {sz}
                            <button
                              type="button"
                              onClick={() => handleSizeToggle(sz)}
                              className="hover:text-red-600 transition-colors cursor-pointer text-sm leading-none"
                              title="Remover opção"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Input to add custom size / variation option */}
                    <div className="flex items-center gap-2 max-w-sm pt-1">
                      <input
                        type="text"
                        value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSize(); } }}
                        placeholder={
                          newProdProductType === 'calçados' ? "Adicionar tamanho personalizado (Ex: 35.5)" :
                          newProdProductType === 'roupas' ? "Adicionar tamanho customizado (Ex: G1, 18, 48)" :
                          newProdProductType === 'perfumes' ? "Adicionar frasco (Ex: 150ml)" :
                          "Adicionar variação (Ex: 220V, Bivolt, kit)"
                        }
                        className="flex-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSize}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        + Incluir
                      </button>
                    </div>
                  </div>

                  {/* --- DYNAMIC ATTRIBUTES (BRAND, GENDER, MATERIAL, COLOR, WARRANTY/VOLUME, SKU) --- */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 block uppercase text-[9px]">Marca / Linha</label>
                      <input
                        type="text"
                        value={newProdBrand}
                        onChange={(e) => setNewProdBrand(e.target.value)}
                        placeholder="Ex: Evidência, Beira Rio, Vizzano, O Boticário"
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 block uppercase text-[9px]">Gênero Público Target</label>
                      <select
                        value={newProdGender}
                        onChange={(e) => setNewProdGender(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value="">Não Especificado / Unissex</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Unissex">Unissex</option>
                        <option value="Infantil">Infantil</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 block uppercase text-[9px]">
                        {newProdProductType === 'calçados' ? 'Material Cabedal / Solado' :
                         newProdProductType === 'roupas' ? 'Tecido / Composição' :
                         newProdProductType === 'perfumes' ? 'Família Olfativa / Notas' :
                         'Material / Composição'}
                      </label>
                      <input
                        type="text"
                        value={newProdMaterial}
                        onChange={(e) => setNewProdMaterial(e.target.value)}
                        placeholder={
                          newProdProductType === 'calçados' ? "Ex: Couro Legítimo / Sola Borracha" :
                          newProdProductType === 'roupas' ? "Ex: 100% Algodão Pima / Jeans Suede" :
                          newProdProductType === 'perfumes' ? "Ex: Amadeirado Ambarado" :
                          "Ex: Couro Ecológico, Metal, Poliéster"
                        }
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 block uppercase text-[9px]">Cor Predominante</label>
                      <input
                        type="text"
                        value={newProdColor}
                        onChange={(e) => setNewProdColor(e.target.value)}
                        placeholder="Ex: Preto Nobre, Caramelo, Nude, Azul Marinho"
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 block uppercase text-[9px]">
                        {newProdProductType === 'perfumes' ? 'Concentração / Tipo' :
                         newProdProductType === 'eletrônicos' ? 'Garantia / Voltagem' :
                         'Voltagem / Especificação Técnica'}
                      </label>
                      <input
                        type="text"
                        value={newProdWarrantyOrVolume}
                        onChange={(e) => setNewProdWarrantyOrVolume(e.target.value)}
                        placeholder={
                          newProdProductType === 'perfumes' ? "Ex: Eau de Parfum, Eau de Toilette" :
                          newProdProductType === 'eletrônicos' ? "Ex: Bivolt / 12 meses garantia" :
                          "Ex: Bivolt, 12 Meses, 100ml"
                        }
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 block uppercase text-[9px]">Ref. Código / Modelo / SKU</label>
                      <input
                        type="text"
                        value={newProdModelOrSku}
                        onChange={(e) => setNewProdModelOrSku(e.target.value)}
                        placeholder="Ex: REF-2026-OX, SKU-9842"
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Extra Key-Value Attributes List */}
                  <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <label className="font-bold text-slate-600 dark:text-slate-300 block uppercase text-[9px]">
                      Atributos Personalizados Extras (Opcional)
                    </label>
                    
                    {newProdCustomAttrs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {newProdCustomAttrs.map((attr, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px]">
                            <strong>{attr.label}:</strong> {attr.value}
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomAttribute(idx)}
                              className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={customAttrLabel}
                        onChange={(e) => setCustomAttrLabel(e.target.value)}
                        placeholder="Nome do Campo (Ex: Salto, Forro)"
                        className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={customAttrValue}
                        onChange={(e) => setCustomAttrValue(e.target.value)}
                        placeholder="Valor (Ex: 7cm, Aveludado)"
                        className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomAttribute}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        + Adicionar Atributo
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Photo Uploader */}
                <div className="space-y-4">
                  <label className="font-bold text-slate-600 block uppercase tracking-wider text-[9px]">Fotos do Produto</label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Local upload file block */}
                    <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/40 relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        disabled={isUploading}
                      />
                      <Upload className="h-6 w-6 text-slate-400 mb-2" />
                      <p className="font-bold text-[11px] text-slate-600 dark:text-slate-300">Carregar Foto Local</p>
                      <p className="text-[9px] text-slate-400 mt-1">JPEG, PNG ou WEBP até 5MB</p>
                    </div>

                    {/* Direct link input block */}
                    <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-center">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500 text-[8px] uppercase block">Adicionar por URL Direta (Link Externo)</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            placeholder="https://site.com/imagem.jpg"
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-[10px]"
                          />
                          <button
                            type="button"
                            onClick={handleAddImageUrl}
                            className="px-3 bg-primary text-white rounded-lg font-bold text-[10px] cursor-pointer"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feedback status */}
                  {uploadFeedback && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 rounded-lg text-[10px] font-bold text-slate-600 flex items-center space-x-1.5 animate-pulse">
                      <Info className="h-3.5 w-3.5 text-primary" />
                      <span>{uploadFeedback}</span>
                    </div>
                  )}

                  {/* Image thumbnails display */}
                  {newProdImages.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="font-bold text-slate-500 text-[9px] uppercase tracking-wider">Imagens Adicionadas ({newProdImages.length})</p>
                      <div className="flex flex-wrap gap-3">
                        {newProdImages.map((imgSrc, idx) => (
                          <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white">
                            <img src={imgSrc} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setNewProdImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                              title="Remover foto"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Store Behavior & Stock */}
                <div className="bg-slate-50 dark:bg-[#1e293b]/20 p-4 rounded-xl border border-slate-100 dark:border-slate-850/80 space-y-4">
                  <h4 className="font-bold uppercase tracking-wider text-[9px] text-slate-400">Atributos &amp; Comportamento na Loja</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
                      <div>
                        <p className="font-bold">Destaque Crediário</p>
                        <p className="text-[9px] text-slate-400">Selo crediário próprio</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProdCrediario(!newProdCrediario)}
                      >
                        {newProdCrediario ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
                      <div>
                        <p className="font-bold">Visível na Vitrine</p>
                        <p className="text-[9px] text-slate-400">Exibir na loja</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProdVisible(!newProdVisible)}
                      >
                        {newProdVisible ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
                      <div>
                        <p className="font-bold">Controle de Estoque</p>
                        <p className="text-[9px] text-slate-400">Ativar dedução automática</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProdStockControl(!newProdStockControl)}
                      >
                        {newProdStockControl ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-150 dark:border-slate-800">
                      <div>
                        <p className="font-bold text-[#9a031e]">Oferta Outlet / Promoção</p>
                        <p className="text-[9px] text-slate-400">Selo de desconto e fita</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewProdOnSale(!newProdOnSale)}
                      >
                        {newProdOnSale ? <ToggleRight className="h-8 w-8 text-[#9a031e]" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>
                  </div>

                  {newProdStockControl && (
                    <div className="space-y-1 w-full max-w-sm pt-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold block uppercase tracking-wider text-[9px] text-slate-500">Unidades Disponíveis em Estoque</label>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200/50 flex items-center gap-1">
                          🔒 API MobLink (Leitura)
                        </span>
                      </div>
                      <input
                        type="number"
                        disabled
                        readOnly
                        value={newProdStock}
                        placeholder="Ex: 15"
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                        title="O estoque é sincronizado diretamente da API do MobLink e não pode ser editado no painel."
                      />
                      <p className="text-[9px] text-slate-400 italic">Atualizado em tempo real pelo sistema de estoque MobLink ERP.</p>
                    </div>
                  )}
                </div>

                {/* Form feedback and action submissions */}
                {formFeedback && (
                  <div className={`p-3 rounded-lg text-xs font-semibold text-center ${
                    formFeedback.includes('sucesso') ? 'bg-green-50 text-green-700 border border-green-150' : 'bg-red-50 text-red-700 border border-red-150'
                  }`}>
                    {formFeedback}
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      resetProductForm();
                      setActiveTab('inventory');
                    }}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary text-white hover:bg-secondary font-bold rounded-lg shadow-md transition-all cursor-pointer"
                  >
                    {editingProduct ? 'Salvar Alterações' : 'Salvar Produto'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* Moblink Products Catalog GET Tab */}
        {activeTab === 'moblink-products' && (
          <MoblinkProductsManager />
        )}

        {/* Moblink Integration Tab */}
        {activeTab === 'moblink' && (
          <MoblinkIntegrationPanel />
        )}

      </main>

    </div>
  );
};
