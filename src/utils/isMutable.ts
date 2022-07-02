import {Mutable} from "../index";

export function isMutable<T extends object>(obj: T): obj is Mutable<T> {
    return !!obj;
}
