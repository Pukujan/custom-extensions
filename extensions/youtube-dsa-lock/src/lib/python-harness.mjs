export const PYTHON_HARNESS = String.raw`
import contextlib
import io
import json
import traceback

result = {"ok": False, "passed": 0, "total": 0, "failure": None, "stdout": ""}
stream = io.StringIO()

try:
    tests = json.loads(TESTS_JSON)
    namespace = {}
    with contextlib.redirect_stdout(stream):
        exec(USER_CODE, namespace, namespace)
        fn = namespace.get(FUNCTION_NAME)
        if not callable(fn):
            raise RuntimeError(f"Define a callable named {FUNCTION_NAME}")

        result["total"] = len(tests)
        for index, case in enumerate(tests, start=1):
            args = case.get("args", [])
            expected = case.get("expected")
            actual = fn(*args)
            if actual != expected:
                result["failure"] = {
                    "test": index,
                    "expected": expected,
                    "actual": actual,
                }
                break
            result["passed"] += 1
        else:
            result["ok"] = True
except Exception:
    result["failure"] = {"error": traceback.format_exc(limit=8)}

result["stdout"] = stream.getvalue()[-4000:]
json.dumps(result)
`;

export async function runWithPyodide(pyodide, { code, functionName, tests }) {
  pyodide.globals.set("USER_CODE", code);
  pyodide.globals.set("FUNCTION_NAME", functionName);
  pyodide.globals.set("TESTS_JSON", JSON.stringify(tests));
  try {
    const raw = await pyodide.runPythonAsync(PYTHON_HARNESS);
    return JSON.parse(raw);
  } finally {
    for (const name of ["USER_CODE", "FUNCTION_NAME", "TESTS_JSON"]) {
      pyodide.globals.delete(name);
    }
  }
}
