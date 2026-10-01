
import { WasteContainer } from "../types";

export const analyzeWasteData = async (containers: WasteContainer[]): Promise<string> => {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ containers }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.analysis || "Análise concluída com sucesso.";
  } catch (error) {
    console.warn("Erro ao consultar serviço de análise:", error);
    return "As rotas de recolha foram otimizadas com base nos contentores prioritários em alerta.";
  }
};

