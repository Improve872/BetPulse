package com.betpulse.collector;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SpoolTest {

	@Test
	void appendsReadsAndReplacesPendingBatches(@TempDir Path directory) throws Exception {
		Spool spool = new Spool(directory);

		spool.enqueue("{\"a\":1}");
		spool.enqueue("{\"b\":2}");

		assertThat(spool.readAll()).containsExactly("{\"a\":1}", "{\"b\":2}");
		assertThat(spool.size()).isEqualTo(2);

		spool.replaceAll(List.of("{\"b\":2}"));

		assertThat(spool.readAll()).containsExactly("{\"b\":2}");
	}

	@Test
	void clearsFileWhenEverythingWasSent(@TempDir Path directory) throws Exception {
		Spool spool = new Spool(directory);
		spool.enqueue("{\"a\":1}");

		spool.replaceAll(List.of());

		assertThat(spool.readAll()).isEmpty();
		assertThat(spool.size()).isZero();
	}

}
