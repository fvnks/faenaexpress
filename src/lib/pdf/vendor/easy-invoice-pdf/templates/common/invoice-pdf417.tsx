import { Image, Text, View } from "@react-pdf/renderer";

interface InvoicePdf417Props {
  pdf417DataUrl: string;
  description?: string;
}

export function InvoicePdf417({
  pdf417DataUrl,
  description,
}: InvoicePdf417Props) {
  return (
    <View
      style={{
        marginTop: 30,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 10, // prevent overlapping with the fixed footer
      }}
    >
      {/* Solo se fija el ancho: el alto se calcula manteniendo la proporción
          del PDF417 (más ancho que alto). */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={pdf417DataUrl} style={{ width: 150 }} />
      {description ? (
        <Text
          style={{
            marginTop: 6,
            fontSize: 8,
            textAlign: "center",
            maxWidth: 220,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}
