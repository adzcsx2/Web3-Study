// import { ApiResponse, cacheManager, http } from "@/http/http";
// import { CategoryListReq, CategoryType as CategoryListRes } from "@/types";
// import { BookListReq, BookType } from "@/types/book";
// import { User } from "@/types/user";
// import { LoginReq } from "@/types/login";

// // 图书相关API
// export const api = {
//   //登录
//   async login(data: LoginReq, isShowLoading = true) {
//     return await http.post<User>("/api/login", data, {
//       showLoading: isShowLoading,
//       throwError: false,
//       enableCache: false,
//     });
//   },
//   //退出登录
//   async logout() {
//     return await http.get<null>(
//       "/api/logout",
//       {},
//       {
//         showLoading: true,
//         enableCache: false,
//       }
//     );
//   },

//   // 获取图书列表
//   async getBookList(data?: BookListReq) {
//     cacheManager.clearAll();
//     return await http.get<BookType[]>("/api/books", data, {
//       throwError: false,
//       showLoading: true,
//       enableCache: false,
//     });
//   },

//   // 获取分类列表
//   async getCategoryList(data?: CategoryListReq) {
//     return await http.get<CategoryListRes[]>("/api/categories", data);
//   },
//   // 获取用户信息
//   async getUserInfo(id?: string) {
//     return await http.get<User>("/api/users/" + id);
//   },
//   // 获取用户列表
//   async getUserList() {
//     return await http.get<User[]>("/api/users");
//   },
//   // 添加用户
//   async addUser(data: User) {
//     return await http.post<string>("/api/users/add", data);
//   },
//   // 更新用户
//   async updateUser(data: User) {
//     return await http.post<string>("/api/users/update", data);
//   },

//   // 创建图书
//   async create(data: BookType) {
//     return await http.post("/book", data, {
//       showSuccess: true,
//       showLoading: true,
//     });
//   },

//   // 获取图书详情
//   async getById(id: string | number) {
//     return await http.get(`/book/${id}`);
//   },

//   // 更新图书
//   async update(id: string | number, data: Partial<BookType>) {
//     return await http.put(`/book/${id}`, data, {
//       showSuccess: true,
//     });
//   },

//   // 删除图书
//   async delete(id: string | number) {
//     return await http.delete(`/book/${id}`, {
//       showSuccess: true,
//     });
//   },

//   // 搜索图书
//   async search(keyword: string) {
//     return await http.get("/book/search", { keyword });
//   },
//   //test
//   async test() {
//     return await http.get("/api/hello");
//   },
// };
