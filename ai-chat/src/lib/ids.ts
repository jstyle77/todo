import { ObjectId } from "mongodb";

/** 문자열을 ObjectId로 바꾼다. 형식이 잘못되었으면 null. */
export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && new ObjectId(id).toHexString() === id.toLowerCase()
    ? new ObjectId(id)
    : null;
}
