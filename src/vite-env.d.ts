/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SINCOM_API_URL?: string;
  readonly VITE_SINCOM_API_USER?: string;
  readonly VITE_SINCOM_API_PASSWORD?: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string;
  readonly VITE_CLOUDINARY_UPLOAD_PRESET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
