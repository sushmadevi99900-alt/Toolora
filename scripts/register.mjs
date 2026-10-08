// Registers the .ts resolve hook for node-run TS scripts.
import { register } from "node:module";

register("./ts-resolve.mjs", import.meta.url);
