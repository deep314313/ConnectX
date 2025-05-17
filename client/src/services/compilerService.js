import axios from 'axios';
import { toast } from 'react-toastify';

// Judge0 API configuration
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_HEADERS = {
  'X-RapidAPI-Key': '1d881ca6d6msh71fc3ec43ee9a34p1b2b45jsn290ce37bd3dc',
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
};

// Alternative compiler APIs as fallbacks
const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';
const GODBOLT_API_URL = 'https://godbolt.org/api/compiler';
const JDOODLE_API_URL = 'https://api.jdoodle.com/v1/execute';
const ONECOMPILER_API_URL = 'https://onecompiler-apis.p.rapidapi.com/api/v1/run';

// Language IDs for Judge0 API
export const LANGUAGE_IDS = {
  javascript: 63,    // JavaScript (Node.js v12.14.0)
  typescript: 74,    // TypeScript 3.7.4
  python: 71,        // Python 3.8.1
  java: 62,          // Java 13.0.1
  cpp: 54,           // C++ (GCC 9.2.0)
  csharp: 51,        // C# (Mono 6.6.0.161)
  php: 68,           // PHP 7.4.1
  ruby: 72,          // Ruby 2.7.0
  go: 60,            // Go 1.13.5
  rust: 73,          // Rust 1.40.0
};

// Debug mode
const DEBUG = true;

// Log details when in debug mode
const debugLog = (message, data = {}) => {
  if (DEBUG) {
    console.log(`[CompilerService] ${message}`, data);
  }
};

// Submit code for execution
export const executeCode = async (language, code, input) => {
  debugLog(`Executing ${language} code`, { codeLength: code.length });
  
  // Special handling for C++ - attempt to fix common issues
  if (language === 'cpp') {
    // Make sure input is properly handled in C++
    debugLog('Special handling for C++ code', { input: input.substring(0, 50) });
    
    // Check if we need to add #include statements
    if (!code.includes('#include <iostream>')) {
      debugLog('Adding missing iostream include for C++');
      code = '#include <iostream>\n' + code;
    }
    
    // Ensure using namespace std if not present but std:: is not used
    if (!code.includes('using namespace std') && 
        !code.includes('std::') && 
        (code.includes('cout') || code.includes('cin') || code.includes('endl'))) {
      debugLog('Adding missing using namespace std for C++');
      const includeEnd = code.lastIndexOf('#include') + 20;
      const insertPos = code.indexOf('\n', includeEnd) + 1;
      code = code.substring(0, insertPos) + 'using namespace std;\n' + code.substring(insertPos);
    }
  }
  
  // Keep track of which services we've tried
  const triedServices = [];
  
  // Toast ID for updating the same toast
  const toastId = toast.loading("Compiling and executing your code...");
  
  debugLog('Starting execution with all available compilers', { language, input });
  
  try {
    // For C++, prioritize JDoodle as it has better C++ support
    if (language === 'cpp') {
      try {
        triedServices.push('JDoodle (C++ specialist)');
        debugLog('Trying JDoodle first for C++');
        const result = await executeWithJDoodle(language, code, input);
        toast.update(toastId, { 
          render: "Code executed successfully with C++ specialist compiler!", 
          type: "success", 
          isLoading: false,
          autoClose: 2000,
        });
        return result;
      } catch (jdoodleError) {
        debugLog('JDoodle C++ execution failed, falling back to Judge0', { error: jdoodleError.message });
      }
    }
    
    // Try Judge0 API first for non-C++ languages or if JDoodle failed for C++
    try {
      triedServices.push('Judge0');
      debugLog('Trying Judge0');
      
      const result = await executeWithJudge0(language, code, input);
      toast.update(toastId, { 
        render: "Code executed successfully!", 
        type: "success", 
        isLoading: false,
        autoClose: 2000,
      });
      return result;
    } catch (error) {
      debugLog('Judge0 execution failed', { error: error.message });
      
      // Fall back to Piston API
      try {
        triedServices.push('Piston');
        toast.update(toastId, { 
          render: `Trying alternative compiler (Piston)...`, 
          type: "info",
          isLoading: true,
        });
        
        debugLog('Trying Piston');
        const result = await executeWithPiston(language, code, input);
        toast.update(toastId, { 
          render: "Code executed successfully with fallback compiler!", 
          type: "success", 
          isLoading: false,
          autoClose: 2000,
        });
        return result;
      } catch (pistonError) {
        debugLog('Piston execution failed', { error: pistonError.message });
        
        // Language-specific fallbacks
        try {
          if (['cpp', 'c'].includes(language) && !triedServices.includes('JDoodle')) {
            triedServices.push('JDoodle');
            toast.update(toastId, { 
              render: `Trying C++ specialized compiler (JDoodle)...`, 
              type: "info",
              isLoading: true,
            });
            
            debugLog('Trying JDoodle for C/C++');
            const result = await executeWithJDoodle(language, code, input);
            toast.update(toastId, { 
              render: "Code executed successfully with specialized compiler!", 
              type: "success", 
              isLoading: false,
              autoClose: 2000,
            });
            return result;
          } else {
            triedServices.push('Godbolt');
            toast.update(toastId, { 
              render: `Trying alternative compiler (Godbolt)...`, 
              type: "info",
              isLoading: true,
            });
            
            debugLog('Trying Godbolt');
            const result = await executeWithGodbolt(language, code, input);
            toast.update(toastId, { 
              render: "Code executed successfully with fallback compiler!", 
              type: "success", 
              isLoading: false,
              autoClose: 2000,
            });
            return result;
          }
        } catch (fallbackError) {
          debugLog('All fallbacks so far failed', { error: fallbackError.message });
          
          // Last resort - try OneCompiler API
          try {
            triedServices.push('OneCompiler');
            toast.update(toastId, { 
              render: `Trying final fallback compiler...`, 
              type: "info",
              isLoading: true,
            });
            
            debugLog('Trying OneCompiler as last resort');
            const result = await executeWithOneCompiler(language, code, input);
            toast.update(toastId, { 
              render: "Code executed successfully with final fallback compiler!", 
              type: "success", 
              isLoading: false,
              autoClose: 2000,
            });
            return result;
          } catch (lastResortError) {
            debugLog('All compilers failed', { error: lastResortError.message });
            throw new Error('All available compilers failed');
          }
        }
      }
    }
  } catch (error) {
    console.error('[CompilerService] Execution failed with all compilers:', error);
    
    toast.update(toastId, { 
      render: `Code execution failed with all compilers (${triedServices.join(', ')})`, 
      type: "error", 
      isLoading: false,
      autoClose: 3000,
    });
    
    throw new Error(`Failed to execute code with all available compilers: ${error.message}`);
  }
};

// Execute code using Judge0 API
const executeWithJudge0 = async (language, code, input) => {
  debugLog('Judge0 execution attempt');
  
  // Step 1: Create submission
  try {
    const submissionResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions`, 
      {
        source_code: code,
        language_id: LANGUAGE_IDS[language],
        stdin: input,
        redirect_stderr_to_stdout: true,
      },
      {
        headers: JUDGE0_HEADERS
      }
    );
    
    debugLog('Judge0 submission response', submissionResponse.data);
    
    const { token } = submissionResponse.data;
    if (!token) {
      throw new Error('Failed to get submission token from Judge0');
    }
    
    // Step 2: Wait for the result (polling)
    let result;
    let retries = 10;
    
    while (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resultResponse = await axios.get(
        `${JUDGE0_API_URL}/submissions/${token}`, 
        { 
          headers: JUDGE0_HEADERS,
          params: { base64_encoded: false }
        }
      );
      
      result = resultResponse.data;
      debugLog(`Judge0 status check (${retries} retries left)`, { 
        statusId: result.status.id, 
        statusDesc: result.status.description 
      });
      
      // Check if processing is complete
      if (result.status.id >= 3) {
        break;
      }
      
      retries--;
    }
    
    if (!result || result.status.id <= 2) {
      throw new Error('Execution timed out or failed with Judge0');
    }
    
    // Handle different status types
    if (result.status.id === 3) {
      return {
        output: result.stdout || '',
        error: null,
        executionTime: result.time,
        memory: result.memory
      };
    } else {
      throw new Error(result.stderr || result.status.description);
    }
  } catch (error) {
    debugLog('Judge0 execution error', { 
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

// Fallback: Execute code using Piston API (free, no API key needed)
const executeWithPiston = async (language, code, input) => {
  debugLog('Piston execution attempt');
  
  // Map language id to Piston's format
  const pistonLangMap = {
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python3',
    java: 'java',
    cpp: 'cpp',
    csharp: 'csharp',
    php: 'php',
    ruby: 'ruby',
    go: 'go',
    rust: 'rust'
  };
  
  try {
    const response = await axios.post(PISTON_API_URL, {
      language: pistonLangMap[language],
      version: 'latest',
      files: [
        {
          content: code
        }
      ],
      stdin: input,
      run_timeout: 5000
    });
    
    debugLog('Piston response', response.data);
    
    const result = response.data.run;
    
    return {
      output: result.stdout,
      error: result.stderr,
      executionTime: result.time,
      memory: null
    };
  } catch (error) {
    debugLog('Piston execution error', { 
      message: error.message,
      status: error.response?.status
    });
    throw error;
  }
};

// Fallback: Execute code using Godbolt API
const executeWithGodbolt = async (language, code, input) => {
  debugLog('Godbolt execution attempt');
  
  // Map language to Godbolt compiler ID
  const godboltCompilerMap = {
    javascript: 'node',
    typescript: 'tsc',
    python: 'python310',
    java: 'java1800',
    cpp: 'g122',
    csharp: 'mono63',
    php: 'php815',
    ruby: 'ruby311',
    go: 'go118',
    rust: 'r1650'
  };
  
  try {
    const response = await axios.post(`${GODBOLT_API_URL}/${godboltCompilerMap[language]}/compile`, {
      source: code,
      options: {
        userArguments: '',
        executeParameters: {
          stdin: input
        }
      }
    });
    
    debugLog('Godbolt response', response.data);
    
    const result = response.data;
    
    if (result.code === 0) {
      return {
        output: result.stdout.join('\n'),
        error: null,
        executionTime: null,
        memory: null
      };
    } else {
      throw new Error(result.stderr.join('\n'));
    }
  } catch (error) {
    debugLog('Godbolt execution error', { 
      message: error.message,
      status: error.response?.status 
    });
    throw error;
  }
};

// Fallback: Execute code using JDoodle API (especially for C++)
const executeWithJDoodle = async (language, code, input) => {
  debugLog('JDoodle execution attempt');
  
  // Map language to JDoodle format
  const jdoodleLangMap = {
    cpp: 'cpp17',
    c: 'c',
    java: 'java',
    python: 'python3'
  };
  
  try {
    const response = await axios.post(`${JDOODLE_API_URL}`, {
      language: jdoodleLangMap[language] || language,
      versionIndex: "0",
      clientId: "guest",
      clientSecret: "guest",
      script: code,
      stdin: input
    });
    
    debugLog('JDoodle response', response.data);
    
    return {
      output: response.data.output,
      error: null,
      executionTime: response.data.cpuTime,
      memory: null
    };
  } catch (error) {
    debugLog('JDoodle execution error', {
      message: error.message,
      status: error.response?.status
    });
    throw error;
  }
};

// Last resort: Execute code using OneCompiler API
const executeWithOneCompiler = async (language, code, input) => {
  debugLog('OneCompiler execution attempt');
  
  // Map language id to OneCompiler format
  const oneCompilerLangMap = {
    javascript: 'nodejs',
    typescript: 'typescript',
    python: 'python3',
    java: 'java',
    cpp: 'cpp',
    csharp: 'csharp',
    php: 'php',
    ruby: 'ruby',
    go: 'go',
    rust: 'rust'
  };
  
  // OneCompiler RapidAPI headers
  const headers = {
    'X-RapidAPI-Key': '1d881ca6d6msh71fc3ec43ee9a34p1b2b45jsn290ce37bd3dc',
    'X-RapidAPI-Host': 'onecompiler-apis.p.rapidapi.com'
  };
  
  try {
    const response = await axios.post(ONECOMPILER_API_URL, {
      language: oneCompilerLangMap[language] || language,
      files: [
        {
          name: 'main',
          content: code
        }
      ],
      stdin: input
    }, { headers });
    
    debugLog('OneCompiler response', response.data);
    
    return {
      output: response.data.stdout || '',
      error: response.data.stderr || null,
      executionTime: response.data.executionTime,
      memory: null
    };
  } catch (error) {
    debugLog('OneCompiler execution error', {
      message: error.message,
      status: error.response?.status
    });
    throw error;
  }
}; 