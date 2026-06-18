import api from "./api";

const productService = {
  // 1. Standard paginated list (Matches @GetMapping in Controller)
  getProducts: (page: number, size: number, status?: string, branchId?: number, sort?: string) => {
    return api.get("/products", {
      params: { page, size, status, branchId, sort },
    });
  },

  // 2. Search method (Matches @GetMapping("/search") in Controller)
  searchProducts: (query: string, page: number, size: number, branchId?: number, sort?: string) => {
    return api.get("/products/search", {
      params: { q: query, page, size, branchId, sort }, // 'q' matches @RequestParam("q")
    });
  },

  getProductsByCategory: (categoryId: number, page: number, size: number, branchId?: number, sort?: string) => {
    return api.get(`/products/category/${categoryId}`, {
      params: { page, size, branchId, sort },
    });
  },

  createProduct: (data: any) => {
    return api.post("/products", data);
  },

  uploadProductImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/products/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteProduct: (id: number) => {
    return api.delete(`/products/${id}`);
  },

  updateProduct: (id: number, data: any) => {
    return api.put(`/products/${id}`, data);
  },
};




export default productService;
