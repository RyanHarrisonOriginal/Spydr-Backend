import type { IRepository } from "../shared/repository.js";
import type { TodoItem } from "./models/index.js";

export interface ITodoItemRepository extends IRepository<TodoItem> {}
