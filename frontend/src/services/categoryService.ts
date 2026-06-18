import api from "./api";

const categoryService = {
  // NEW: Image Upload endpoint
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/categories/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  createCategory: (data: any) => api.post("/categories", data),
  updateCategory: (id: number, data: any) => api.put(`/categories/${id}`, data),
  getCategoryById: (id: number) => api.get(`/categories/${id}`),
  getAllCategories: (page: number, size: number, status?: string) => 
    api.get("/categories", { params: { page, size, status } }),
  getRootCategories: () => api.get("/categories/root"),
  getSubcategories: (parentId: number) => api.get(`/categories/${parentId}/subcategories`),
  getCategoryHierarchy: () => api.get("/categories/hierarchy"),
  searchCategories: (query: string, page: number, size: number) => 
    api.get("/categories/search", { params: { q: query, page, size } }),
  deleteCategory: (id: number) => api.delete(`/categories/${id}`),
};

export default categoryService;