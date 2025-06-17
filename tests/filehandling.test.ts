import { Converter } from '../src/converter';

describe('File Handling Tests', () => {
  let converter: Converter;

  beforeEach(() => {
    converter = new Converter();
  });

  // OPENFILE Tests
  describe('OPENFILE', () => {
    it('should convert Python open for read to OPENFILE FOR READ', async () => {
      const pythonCode = 'file = open("data.txt", "r")';
      const result = await converter.convert(pythonCode);
      // Python's open() returns a file object. IGCSE uses OPENFILE and then refers to the filename string.
      // This requires a convention: the Python variable `file` might not directly map if IGCSE uses the filename string for subsequent operations.
      // Let's assume the converter translates this to the IGCSE command directly.
      expect(result.code).toBe('OPENFILE "data.txt" FOR READ');
    });

    it('should convert Python open for write to OPENFILE FOR WRITE', async () => {
      const pythonCode = 'output_file = open("output.txt", "w")';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('OPENFILE "output.txt" FOR WRITE');
    });

    it('should convert Python open for append to OPENFILE FOR APPEND', async () => {
      const pythonCode = 'log_file = open("log.txt", "a")';
      const result = await converter.convert(pythonCode);
      expect(result.code).toBe('OPENFILE "log.txt" FOR APPEND');
    });
  });

  // READFILE Tests
  describe('READFILE', () => {
    it('should convert reading a line from a file to READFILE', async () => {
      const pythonCode = 
`# Assume file is opened as "input.txt" FOR READ
# file_handle = open("input.txt", "r") 
line_content = file_handle.readline()`;
      // Full context for the converter:
      const fullPythonCode = 
`file_handle = open("input.txt", "r")
line_content = file_handle.readline()`;
      const result = await converter.convert(fullPythonCode);
      // IGCSE: READFILE "filename", Variable
      expect(result.code).toContain('OPENFILE "input.txt" FOR READ');
      expect(result.code).toContain('READFILE "input.txt", line_content');
    });

    // Reading entire file content (e.g. file.read()) might map to a loop of READFILE in IGCSE
    // This is a more complex scenario.
  });

  // WRITEFILE Tests
  describe('WRITEFILE', () => {
    it('should convert writing a string to a file to WRITEFILE', async () => {
      const pythonCode = 
`# Assume file is opened as "output.txt" FOR WRITE
# file_handle = open("output.txt", "w")
# data_to_write = "Hello, file!"
# file_handle.write(data_to_write)`;
      const fullPythonCode = 
`file_handle = open("output.txt", "w")
data_to_write = "Hello, file!"
file_handle.write(data_to_write)`;
      const result = await converter.convert(fullPythonCode);
      // IGCSE: WRITEFILE "filename", Data
      expect(result.code).toContain('OPENFILE "output.txt" FOR WRITE');
      expect(result.code).toContain('data_to_write ← "Hello, file!"'); // Assignment of data
      expect(result.code).toContain('WRITEFILE "output.txt", data_to_write');
    });
  });

  // CLOSEFILE Tests
  describe('CLOSEFILE', () => {
    it('should convert file close to CLOSEFILE', async () => {
      const pythonCode = 
`# file_handle = open("my_doc.txt", "r")
# ... operations ...
# file_handle.close()`;
      const fullPythonCode = 
`file_handle = open("my_doc.txt", "r")
file_handle.close()`;
      const result = await converter.convert(fullPythonCode);
      expect(result.code).toContain('OPENFILE "my_doc.txt" FOR READ');
      expect(result.code).toContain('CLOSEFILE "my_doc.txt"');
    });
  });

  // EOF (End Of File) Check
  describe('EOF Check', () => {
    it('should handle EOF check in a loop (conceptual)', async () => {
      // Python: for line in file_handle: ... or while True: line = file.readline(); if not line: break
      // IGCSE: WHILE NOT EOF("filename") ... READFILE ... ENDWHILE
      const pythonCode = 
`# file = open("log.txt", "r")
# while True:
#     line = file.readline()
#     if not line: # EOF check
#         break
#     print(line.strip())
# file.close()`;
      // This requires sophisticated loop and EOF pattern recognition.
      // Let's test the IGCSE structure if the converter can produce it.
      const fullPythonCodeLoop = 
`log_file = open("activity.log", "r")
while True:
    current_line = log_file.readline()
    if not current_line:
        break
    print(current_line)
log_file.close()`;
      const result = await converter.convert(fullPythonCodeLoop);
      const expected_loop_structure = 
`OPENFILE "activity.log" FOR READ
WHILE NOT EOF("activity.log")
  READFILE "activity.log", current_line
  OUTPUT current_line
ENDWHILE
CLOSEFILE "activity.log"`;
      // The exact translation of print(current_line) and the loop variable might vary.
      // We are checking for the core WHILE NOT EOF, READFILE, ENDWHILE structure.
      expect(result.code).toContain('OPENFILE "activity.log" FOR READ');
      expect(result.code).toContain('WHILE NOT EOF("activity.log")');
      expect(result.code).toContain('READFILE "activity.log", current_line');
      expect(result.code).toContain('OUTPUT current_line'); // Or however print is handled
      expect(result.code).toContain('ENDWHILE');
      expect(result.code).toContain('CLOSEFILE "activity.log"');
    });
  });

  // Example: Reading all lines from a file
  describe('Complete File Read Example', () => {
    it('should convert reading all lines and printing them', async () => {
      const pythonCode = 
`with open("example.txt", "r") as f:
    for line in f:
        print(line.strip())`;
      const result = await converter.convert(pythonCode);
      // `with open(...)` implies OPEN and CLOSE.
      // `for line in f` implies WHILE NOT EOF and READFILE.
      const expected = 
`OPENFILE "example.txt" FOR READ
WHILE NOT EOF("example.txt")
  READFILE "example.txt", line // Assuming 'line' is the variable used
  // print(line.strip()) might become OUTPUT line (if strip is handled or ignored)
  OUTPUT line 
ENDWHILE
CLOSEFILE "example.txt"`;
      expect(result.code).toContain('OPENFILE "example.txt" FOR READ');
      expect(result.code).toContain('WHILE NOT EOF("example.txt")');
      expect(result.code).toContain('READFILE "example.txt", line');
      expect(result.code).toContain('OUTPUT line');
      expect(result.code).toContain('ENDWHILE');
      expect(result.code).toContain('CLOSEFILE "example.txt"');
    });
  });
});