import { read_defination } from "./ReadFile";
import { write_to_file_defination } from "./WriteToFile";

export const toolDefinations = [
    read_defination,
    write_to_file_defination,
];


// write to a particual position in a file (for a single change)
// update the whole file (for multiple changes / rewrite)
// replace a particular section with new content in a file
// delete a particual section in a file

// delete the whole file
// create a new file