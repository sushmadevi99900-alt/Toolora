"use client";

import { WordCounterTool } from "./WordCounterTool";
import {
  CharacterCounterTool,
  CaseConverterTool,
  RemoveDuplicateLinesTool,
  RemoveExtraSpacesTool,
  TextSorterTool,
  TextReverserTool,
  LineCounterTool,
  ReadingTimeTool,
  LoremIpsumTool,
} from "./workspaces/TextWorkspaces";
import {
  PercentageCalculatorTool,
  AgeCalculatorTool,
  DateDifferenceTool,
  BmiCalculatorTool,
  DiscountCalculatorTool,
  TipCalculatorTool,
  AverageCalculatorTool,
  RatioCalculatorTool,
  FractionCalculatorTool,
} from "./workspaces/CalculatorWorkspaces";
import {
  UnitConverterTool,
  LengthConverterTool,
  WeightConverterTool,
  TemperatureConverterTool,
  AreaConverterTool,
  VolumeConverterTool,
  SpeedConverterTool,
  TimeConverterTool,
  DataStorageConverterTool,
  NumberBaseConverterTool,
} from "./workspaces/ConverterWorkspaces";
import {
  JsonFormatterTool,
  JsonValidatorTool,
  JsonMinifierTool,
  Base64EncoderTool,
  Base64DecoderTool,
  UrlEncoderTool,
  UrlDecoderTool,
  UuidGeneratorTool,
  TimestampConverterTool,
} from "./workspaces/DeveloperWorkspaces";
import {
  PasswordGeneratorTool,
  RandomNumberGeneratorTool,
  RandomStringGeneratorTool,
  ColorGeneratorTool,
  SecureTokenGeneratorTool,
  QrGeneratorTool,
  StrongPasswordGeneratorTool,
  UsernameGeneratorTool,
} from "./workspaces/GeneratorWorkspaces";
import {
  ImageCompressorTool,
  ImageResizerTool,
  ImageCropperTool,
  JpgToPngTool,
  PngToJpgTool,
  WebpConverterTool,
  ImageToWebpTool,
  ImageToBase64Tool,
  Base64ToImageTool,
  ImageColorPickerTool,
  ImageMetadataViewerTool,
  ExifDataRemoverTool,
  ImageBlurTool,
  ImageRotateTool,
  ImageFlipTool,
} from "./workspaces/ImageWorkspaces";
import {
  PdfCompressorTool,
  MergePdfTool,
  SplitPdfTool,
  JpgToPdfTool,
  PngToPdfTool,
  PdfToJpgTool,
  PdfToPngTool,
  PdfPageExtractorTool,
  PdfPageRotatorTool,
  PdfMetadataViewerTool,
  PdfPasswordGeneratorTool,
  PdfTextExtractorTool,
  PdfToTextTool,
  TextToPdfTool,
  PdfPageCounterTool,
} from "./workspaces/PdfWorkspaces";
import {
  CoinFlipTool,
  DiceRollerTool,
  StopwatchTool,
  CountdownTimerTool,
  TextToSpeechTool,
} from "./workspaces/UtilityWorkspaces";
import {
  JsonToCsvTool,
  CsvToJsonTool,
  RegexTesterTool,
  HtmlFormatterTool,
  CssFormatterTool,
  JavascriptFormatterTool,
  HtmlMinifierTool,
  CssMinifierTool,
  JavascriptMinifierTool,
  JwtDecoderTool,
  HashGeneratorTool,
} from "./workspaces/DeveloperWorkspaces";
import { TextCleanerTool } from "./workspaces/TextWorkspaces";
import {
  EmiCalculatorTool,
  GstCalculatorTool,
  LoanCalculatorTool,
  CompoundInterestTool,
  SimpleInterestTool,
  TimeDurationTool,
} from "./workspaces/CalculatorWorkspaces";
import { getTool } from "@/data/tools";
import { ToolUseTracker } from "../analytics/Analytics";

function UpperCaseTool() { return <CaseConverterTool defaultMode="upper" />; }
function LowerCaseTool() { return <CaseConverterTool defaultMode="lower" />; }
function TitleCaseTool() { return <CaseConverterTool defaultMode="title" />; }
function SentenceCaseTool() { return <CaseConverterTool defaultMode="sentence" />; }

/**
 * Tool engine dispatcher — the ONLY place that maps a tool slug
 * to its interactive workspace. Tool pages never embed tool logic.
 */
const REGISTRY: Record<string, React.ComponentType> = {
  "word-counter": WordCounterTool,
  "character-counter": CharacterCounterTool,
  "case-converter": UpperCaseTool,
  "uppercase-converter": UpperCaseTool,
  "lowercase-converter": LowerCaseTool,
  "title-case-converter": TitleCaseTool,
  "sentence-case-converter": SentenceCaseTool,
  "remove-duplicate-lines": RemoveDuplicateLinesTool,
  "remove-extra-spaces": RemoveExtraSpacesTool,
  "text-sorter": TextSorterTool,
  "text-reverser": TextReverserTool,
  "line-counter": LineCounterTool,
  "reading-time": ReadingTimeTool,
  "lorem-ipsum-generator": LoremIpsumTool,
  "percentage-calculator": PercentageCalculatorTool,
  "age-calculator": AgeCalculatorTool,
  "date-difference": DateDifferenceTool,
  "bmi-calculator": BmiCalculatorTool,
  "discount-calculator": DiscountCalculatorTool,
  "tip-calculator": TipCalculatorTool,
  "average-calculator": AverageCalculatorTool,
  "ratio-calculator": RatioCalculatorTool,
  "fraction-calculator": FractionCalculatorTool,
  "unit-converter": UnitConverterTool,
  "length-converter": LengthConverterTool,
  "weight-converter": WeightConverterTool,
  "temperature-converter": TemperatureConverterTool,
  "area-converter": AreaConverterTool,
  "volume-converter": VolumeConverterTool,
  "speed-converter": SpeedConverterTool,
  "time-converter": TimeConverterTool,
  "data-storage-converter": DataStorageConverterTool,
  "number-base-converter": NumberBaseConverterTool,
  "json-formatter": JsonFormatterTool,
  "json-validator": JsonValidatorTool,
  "json-minifier": JsonMinifierTool,
  "base64-encoder": Base64EncoderTool,
  "base64-decoder": Base64DecoderTool,
  "url-encoder": UrlEncoderTool,
  "url-decoder": UrlDecoderTool,
  "uuid-generator": UuidGeneratorTool,
  "timestamp-converter": TimestampConverterTool,
  "password-generator": PasswordGeneratorTool,
  "strong-password-generator": StrongPasswordGeneratorTool,
  "username-generator": UsernameGeneratorTool,
  "random-number-generator": RandomNumberGeneratorTool,
  "random-string-generator": RandomStringGeneratorTool,
  "color-generator": ColorGeneratorTool,
  "secure-token-generator": SecureTokenGeneratorTool,
  "qr-generator": QrGeneratorTool,
  // Images
  "image-compressor": ImageCompressorTool,
  "image-resizer": ImageResizerTool,
  "image-cropper": ImageCropperTool,
  "jpg-to-png": JpgToPngTool,
  "png-to-jpg": PngToJpgTool,
  "webp-converter": WebpConverterTool,
  "image-to-webp": ImageToWebpTool,
  "image-to-base64": ImageToBase64Tool,
  "base64-to-image": Base64ToImageTool,
  "image-color-picker": ImageColorPickerTool,
  "image-metadata-viewer": ImageMetadataViewerTool,
  "exif-data-remover": ExifDataRemoverTool,
  "image-blur": ImageBlurTool,
  "image-rotate": ImageRotateTool,
  "image-flip": ImageFlipTool,
  // PDF
  "pdf-compressor": PdfCompressorTool,
  "merge-pdf": MergePdfTool,
  "split-pdf": SplitPdfTool,
  "jpg-to-pdf": JpgToPdfTool,
  "png-to-pdf": PngToPdfTool,
  "pdf-to-jpg": PdfToJpgTool,
  "pdf-to-png": PdfToPngTool,
  "pdf-page-extractor": PdfPageExtractorTool,
  "pdf-page-rotator": PdfPageRotatorTool,
  "pdf-metadata-viewer": PdfMetadataViewerTool,
  "pdf-password-generator": PdfPasswordGeneratorTool,
  "pdf-text-extractor": PdfTextExtractorTool,
  "pdf-to-text": PdfToTextTool,
  "text-to-pdf": TextToPdfTool,
  "pdf-page-counter": PdfPageCounterTool,
  // Utilities
  "coin-flip": CoinFlipTool,
  "dice-roller": DiceRollerTool,
  "stopwatch": StopwatchTool,
  "countdown-timer": CountdownTimerTool,
  "text-to-speech": TextToSpeechTool,
  // Developer extras
  "json-to-csv": JsonToCsvTool,
  "csv-to-json": CsvToJsonTool,
  "regex-tester": RegexTesterTool,
  "html-formatter": HtmlFormatterTool,
  "css-formatter": CssFormatterTool,
  "javascript-formatter": JavascriptFormatterTool,
  "html-minifier": HtmlMinifierTool,
  "css-minifier": CssMinifierTool,
  "javascript-minifier": JavascriptMinifierTool,
  "jwt-decoder": JwtDecoderTool,
  "hash-generator": HashGeneratorTool,
  // Text extras
  "text-cleaner": TextCleanerTool,
  // Calculator extras
  "emi-calculator": EmiCalculatorTool,
  "gst-calculator": GstCalculatorTool,
  "loan-calculator": LoanCalculatorTool,
  "compound-interest": CompoundInterestTool,
  "simple-interest": SimpleInterestTool,
  "time-duration": TimeDurationTool,
};

/** True when a slug has a real working implementation (never faked). */
export function hasWorkspace(slug: string): boolean {
  return slug in REGISTRY;
}

export function ToolWorkspace({ slug }: { slug: string }) {
  const Component = REGISTRY[slug];
  const tool = getTool(slug);
  if (!Component || !tool) return <p className="text-[15px] text-(--muted)">Interactive workspace loading…</p>;
  return (
    <>
      <ToolUseTracker slug={tool.slug} category={tool.category} />
      <Component />
    </>
  );
}
