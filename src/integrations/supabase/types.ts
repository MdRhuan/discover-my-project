export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          arquivada: boolean
          cfc_flag: boolean
          created_at: string
          data_abertura: string | null
          data_encerramento: string | null
          documento: string | null
          estado: string | null
          id: string
          nome: string
          notas: string | null
          pais: string
          setor: string | null
          socios: Json
          status: string
          tags: string[]
          tipo_juridico: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arquivada?: boolean
          cfc_flag?: boolean
          created_at?: string
          data_abertura?: string | null
          data_encerramento?: string | null
          documento?: string | null
          estado?: string | null
          id?: string
          nome: string
          notas?: string | null
          pais?: string
          setor?: string | null
          socios?: Json
          status?: string
          tags?: string[]
          tipo_juridico?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arquivada?: boolean
          cfc_flag?: boolean
          created_at?: string
          data_abertura?: string | null
          data_encerramento?: string | null
          documento?: string | null
          estado?: string | null
          id?: string
          nome?: string
          notas?: string | null
          pais?: string
          setor?: string | null
          socios?: Json
          status?: string
          tags?: string[]
          tipo_juridico?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          ano_fiscal: string | null
          categoria: string
          company_id: string | null
          created_at: string
          data_upload: string
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          mime_type: string | null
          nome: string
          notas: string | null
          status_doc: string
          updated_at: string
          user_id: string
          versao: string
        }
        Insert: {
          ano_fiscal?: string | null
          categoria?: string
          company_id?: string | null
          created_at?: string
          data_upload?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          notas?: string | null
          status_doc?: string
          updated_at?: string
          user_id: string
          versao?: string
        }
        Update: {
          ano_fiscal?: string | null
          categoria?: string
          company_id?: string | null
          created_at?: string
          data_upload?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          notas?: string | null
          status_doc?: string
          updated_at?: string
          user_id?: string
          versao?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          admissao: string | null
          arquivado: boolean
          cargo: string | null
          company_id: string | null
          created_at: string
          departamento: string | null
          documento: string | null
          email: string | null
          id: string
          moeda_salario: string
          nome: string
          pais: string
          salario: number | null
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admissao?: string | null
          arquivado?: boolean
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          departamento?: string | null
          documento?: string | null
          email?: string | null
          id?: string
          moeda_salario?: string
          nome: string
          pais?: string
          salario?: number | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admissao?: string | null
          arquivado?: boolean
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          departamento?: string | null
          documento?: string | null
          email?: string | null
          id?: string
          moeda_salario?: string
          nome?: string
          pais?: string
          salario?: number | null
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          arquivada: boolean
          company_id: string | null
          created_at: string
          descricao: string | null
          id: string
          notas: string | null
          prioridade: string
          responsavel: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
          vencimento: string | null
        }
        Insert: {
          arquivada?: boolean
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          notas?: string | null
          prioridade?: string
          responsavel?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          user_id: string
          vencimento?: string | null
        }
        Update: {
          arquivada?: boolean
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          notas?: string | null
          prioridade?: string
          responsavel?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
