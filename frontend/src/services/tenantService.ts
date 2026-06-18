import api from "./api";

const tenantService = {
  getTenant: () => {
    return api.get("/tenants/current");
  },
};

export default tenantService;
