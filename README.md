# bundle
# bundle
# Bundle - Gemini Local avec Ollama, LM Studio & autres

Ce projet permet d'utiliser Gemini avec des modèles d'IA exécutés localement via **Ollama**, **LM Studio** ou d'autres solutions similaires.

## 🚀 Fonctionnalités

- Support des modèles locaux via Ollama
- Compatibilité avec LM Studio
- Modèles de sandbox macOS pour la sécurité
- Tree-sitter pour l'analyse syntaxique
- Pas besoin d'API externe - tout tourne en local

## 📋 Prérequis

### Options disponibles (choisissez-en une) :

**Option 1: Ollama**
```bash
# Installer Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Télécharger un modèle (exemple avec llama2)
ollama pull llama2