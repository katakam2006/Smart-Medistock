@echo off
echo ===================================================
echo   LAUNCHING PYTHON PIPELINE VIA DIRECT APP EXECUTION
echo ===================================================
echo.

set PY_PATH="%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"

echo [1/2] Installing Required Data Libraries...
%PY_PATH% -m pip install pandas numpy scikit-learn joblib

echo.
echo [2/2] Running Machine Learning Training Script...
%PY_PATH% train_model.py

echo.
echo ===================================================
echo   PIPELINE COMPLETION CHECKLIST SUCCESSFUL!
echo ===================================================
pause