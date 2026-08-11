import type {
  INodeTypeTransformRequest,
  INodeTypeTransformResult,
} from "../node-type-transform/index.js";

export interface INodeTypeTransformRepository {
  transform(request: INodeTypeTransformRequest): Promise<INodeTypeTransformResult>;
}
