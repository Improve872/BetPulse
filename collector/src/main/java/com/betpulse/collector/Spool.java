package com.betpulse.collector;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;

/**
 * Cola de batches pendientes en disco. Sobrevive a caídas del backend y a
 * reinicios del colector.
 */
public final class Spool {

	private final Path file;

	public Spool(Path directory) throws IOException {
		Files.createDirectories(directory);
		this.file = directory.resolve("pending.jsonl");
	}

	public synchronized void enqueue(String json) throws IOException {
		String line = json.replace("\r", "").replace("\n", "");
		Files.writeString(file, line + System.lineSeparator(), StandardCharsets.UTF_8,
				StandardOpenOption.CREATE, StandardOpenOption.APPEND);
	}

	public synchronized List<String> readAll() throws IOException {
		if (!Files.exists(file)) {
			return List.of();
		}
		List<String> lines = new ArrayList<>();
		for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
			if (!line.isBlank()) {
				lines.add(line);
			}
		}
		return lines;
	}

	public synchronized void replaceAll(List<String> lines) throws IOException {
		if (lines.isEmpty()) {
			Files.deleteIfExists(file);
			return;
		}
		Path temp = file.resolveSibling(file.getFileName() + ".tmp");
		Files.write(temp, lines, StandardCharsets.UTF_8);
		Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
	}

	public synchronized int size() throws IOException {
		return readAll().size();
	}

	public Path file() {
		return file;
	}

}
